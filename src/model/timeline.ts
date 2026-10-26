import { normalizePath, TFile, type App } from "obsidian";
import { get } from "svelte/store";

import type { MultipleSceneDraft, TimeframeFormat } from "./types";
import { projectFolderPath, scenePath } from "./scene-navigation";
import { workflows } from "./stores";
import {
  compareTimeframes,
  deriveUnits,
  isTimeframeParseError,
  parseTimeframe,
  presentUnits,
  type TimeframeUnit,
  type TimeframeValues,
} from "./timeframe";

const DEFAULT_TARGET = "manuscript.md";

const FORMAT_LABELS: Record<TimeframeFormat, string> = {
  "epoch-datetime-dmy": "Epoch date time (num dd/mm/yyyy hh:mm:ss)",
  "epoch-datetime-mdy": "Epoch date time (num mm/dd/yyyy hh:mm:ss)",
  datetime: "Date time (dd/mm/yyyy hh:mm:ss)",
  time: "Time only (hh:mm:ss)",
  number: "Chronological order (num)",
};

export type TimelineError = {
  sceneTitle: string;
  kind: "empty" | "format" | "range" | "inconsistent";
  message: string;
};

export type TimelineEntry = {
  sceneTitle: string;
  values: TimeframeValues;
  /** The vault-relative path to the scene's note. */
  path: string;
};

export type TimelineResult = {
  title: string;
  tagName: string;
  format: TimeframeFormat;
  /** The units every entry uses, coarsest first. */
  units: TimeframeUnit[];
  primaryUnit: TimeframeUnit;
  secondaryUnit: TimeframeUnit;
  entries: TimelineEntry[];
  missing: string[];
  errors: TimelineError[];
};

/** Collects scene timeframes and validates them against the project format. */
export async function buildTimeline(
  app: App,
  draft: MultipleSceneDraft
): Promise<TimelineResult> {
  const tagName = draft.timeframeTagName;
  const format = draft.timeFormat;
  const entries: TimelineEntry[] = [];
  const missing: string[] = [];
  const errors: TimelineError[] = [];

  for (let index = 0; index < draft.scenes.length; index++) {
    const scene = draft.scenes[index];
    const next = draft.scenes[index + 1];

    // Scenes with children are structural containers, not timeline events.
    if (next && next.indent > scene.indent) {
      continue;
    }

    const path = scenePath(scene.title, draft, app.vault);
    const file = app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      continue;
    }

    const raw = app.metadataCache.getFileCache(file)?.frontmatter?.[tagName];
    if (raw === undefined || raw === null || `${raw}`.trim() === "") {
      missing.push(scene.title);
      continue;
    }

    const parsed = parseTimeframe(raw, format);
    if (isTimeframeParseError(parsed)) {
      const { error } = parsed;
      errors.push({
        sceneTitle: scene.title,
        kind: error.kind,
        message:
          error.kind === "empty"
            ? "has an empty timeframe value."
            : error.kind === "range"
            ? `has an out-of-range ${error.unit} value (${error.value}).`
            : `does not match the configured format (${FORMAT_LABELS[format]}).`,
      });
      continue;
    }

    entries.push({
      sceneTitle: scene.title,
      values: parsed.values,
      path,
    });
  }

  const consistent = keepConsistent(entries, errors);
  consistent.sort((a, b) => compareTimeframes(a.values, b.values));
  const [primaryUnit, secondaryUnit] = deriveUnits(
    consistent.map((entry) => entry.values),
    format
  );
  const units =
    consistent.length > 0
      ? presentUnits(format).filter(
          (unit) => consistent[0].values[unit] !== undefined
        )
      : [];

  return {
    title: draft.title,
    tagName,
    format,
    units,
    primaryUnit,
    secondaryUnit,
    entries: consistent,
    missing,
    errors,
  };
}

/** Drops entries whose unit count differs from the majority. */
function keepConsistent(
  entries: TimelineEntry[],
  errors: TimelineError[]
): TimelineEntry[] {
  const counts = new Map<number, number>();
  for (const entry of entries) {
    const count = Object.keys(entry.values).length;
    counts.set(count, (counts.get(count) ?? 0) + 1);
  }
  if (counts.size <= 1) {
    return entries;
  }

  const reference = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const kept: TimelineEntry[] = [];

  for (const entry of entries) {
    const count = Object.keys(entry.values).length;
    if (count === reference) {
      kept.push(entry);
    } else {
      errors.push({
        sceneTitle: entry.sceneTitle,
        kind: "inconsistent",
        message: `uses ${count} time units, but the rest of the project uses ${reference}.`,
      });
    }
  }

  return kept;
}

/** Writes the timeline beside the compiled manuscript. */
export async function writeTimeline(
  app: App,
  draft: MultipleSceneDraft,
  result: TimelineResult
): Promise<void> {
  if (result.entries.length === 0 && result.errors.length === 0) {
    return;
  }

  const path = timelinePath(app, draft);
  const contents = renderTimeline(result);

  if (
    (await app.vault.adapter.exists(path)) &&
    (await app.vault.adapter.read(path)) === contents
  ) {
    return;
  }

  const folder = path.split("/").slice(0, -1).join("/");
  if (folder && !(await app.vault.adapter.exists(folder))) {
    await app.vault.createFolder(folder).catch(() => undefined);
  }

  await app.vault.adapter.write(path, contents);
}

/** Compiled manuscript path with `_timeline` before the extension. */
function timelinePath(app: App, draft: MultipleSceneDraft): string {
  const workflow = draft.workflow ? get(workflows)[draft.workflow] : undefined;
  const step = workflow?.steps.find(
    (candidate) => candidate.description.canonicalID === "write-to-note"
  );
  const configured = step?.optionValues?.["target"];
  const target =
    typeof configured === "string" && configured.trim().length > 0
      ? configured.trim()
      : DEFAULT_TARGET;
  const rawTarget = target.replace("$1", draft.title);
  const withExtension = /\.\w+$/.test(rawTarget)
    ? rawTarget
    : `${rawTarget}.md`;
  const compiled = withExtension.startsWith("/")
    ? normalizePath(withExtension.slice(1))
    : normalizePath(
        `${projectFolderPath(draft, app.vault)}/${withExtension}`
      );

  return compiled.replace(/(\.[^./]+)$/, "_timeline$1");
}

function sanitize(text: string): string {
  return text.replace(/:/g, " -").replace(/\n/g, " ").trim();
}

function pad(value: number | undefined, length: number): string {
  return value === undefined ? "" : `${value}`.padStart(length, "0");
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function unitLabel(value: number, unit: TimeframeUnit): string {
  if (unit === "year") {
    return pad(value, 4);
  }
  if (unit === "month") {
    return MONTHS[value - 1] ?? pad(value, 2);
  }
  if (unit === "epoch" || unit === "number") {
    return `${value}`;
  }
  return pad(value, 2);
}

/** Formats selected units: months by name, dates with dashes, times with `timeSeparator`. */
function unitValues(
  values: TimeframeValues,
  units: TimeframeUnit[],
  timeSeparator = "."
): string {
  if (values.number !== undefined) {
    return `${values.number}`;
  }

  const parts: string[] = [];
  if (units.includes("epoch") && values.epoch !== undefined) {
    parts.push(`${values.epoch}`);
  }

  const date = units
    .filter((unit) => unit === "year" || unit === "month" || unit === "day")
    .map((unit) =>
      unit === "month"
        ? MONTHS[(values[unit] ?? 1) - 1] ?? ""
        : pad(values[unit], unit === "year" ? 4 : 2)
    )
    .filter((value) => value.length > 0);
  if (date.length > 0) {
    parts.push(date.join("-"));
  }

  const time = units
    .filter((unit) => unit === "hour" || unit === "minute" || unit === "second")
    .map((unit) => pad(values[unit], 2))
    .filter((value) => value.length > 0);
  if (time.length > 0) {
    parts.push(time.join(timeSeparator));
  }

  return parts.join(" ");
}

/** Builds the Mermaid timeline. */
function renderMermaid(result: TimelineResult): string {
  const primary = result.primaryUnit;
  const secondary = result.secondaryUnit;
  const lines = [
    "```mermaid",
    "timeline",
    `    title ${sanitize(result.title)}`,
  ];

  if (primary === "number") {
    lines.push("    section Timeline");
    for (const entry of result.entries) {
      lines.push(
        `        ${entry.values.number} : ${sanitize(entry.sceneTitle)}`
      );
    }
    lines.push("```");
    return lines.join("\n");
  }

  const present = result.units;
  const primaryIndex = present.indexOf(primary);
  const secondaryIndex = present.indexOf(secondary);
  const between =
    secondary === primary
      ? []
      : present.slice(primaryIndex + 1, secondaryIndex + 1);
  const below = present.slice(secondaryIndex + 1);

  const primaryGroups = new Map<string, TimelineEntry[]>();
  for (const entry of result.entries) {
    const key = `${entry.values[primary] ?? ""}`;
    const group = primaryGroups.get(key) ?? [];
    group.push(entry);
    primaryGroups.set(key, group);
  }

  const sortedPrimary = [...primaryGroups.entries()].sort(
    (a, b) => Number(a[0]) - Number(b[0])
  );

  for (const [primaryValue, primaryEntries] of sortedPrimary) {
    lines.push(`    section ${unitLabel(Number(primaryValue), primary)}`);

    if (between.length === 0) {
      for (const entry of primaryEntries) {
        const periodLabel = unitLabel(Number(entry.values[primary]), primary);
        const time =
          below.length > 0
            ? unitValues(entry.values, below, ":")
            : unitValues(entry.values, present, ":");
        lines.push(
          `        ${periodLabel} : ${time}<br>${sanitize(entry.sceneTitle)}`
        );
      }
      continue;
    }

    const periods = new Map<string, TimelineEntry[]>();
    for (const entry of primaryEntries) {
      const key = between.map((unit) => entry.values[unit]).join("|");
      const group = periods.get(key) ?? [];
      group.push(entry);
      periods.set(key, group);
    }

    const sortedPeriods = [...periods.entries()].sort((a, b) => {
      const left = a[0].split("|").map(Number);
      const right = b[0].split("|").map(Number);
      for (let index = 0; index < left.length; index++) {
        if (left[index] !== right[index]) {
          return left[index] - right[index];
        }
      }
      return 0;
    });

    for (const [, periodEntries] of sortedPeriods) {
      const label = unitValues(periodEntries[0].values, between);
      const continuation = " ".repeat(8 + label.length + 1);

      periodEntries.forEach((entry, index) => {
        const time =
          below.length > 0
            ? unitValues(entry.values, below, ":")
            : unitValues(entry.values, present, ":");
        const event = `${time}<br>${sanitize(entry.sceneTitle)}`;
        const prefix =
          index === 0 ? `        ${label} : ` : `${continuation}: `;
        lines.push(`${prefix}${event}`);
      });
    }
  }

  lines.push("```");
  return lines.join("\n");
}

function renderTimeline(result: TimelineResult): string {
  if (result.errors.length > 0) {
    const problems = ["## Problems", ""];
    for (const error of result.errors) {
      problems.push(`- **${error.sceneTitle}** ${error.message}`);
    }
    problems.push("", "Fix these and the timeline will be rebuilt.");
    return `# Story Timeline\n\n${problems.join("\n")}\n`;
  }

  const primary = result.primaryUnit;
  const secondary = result.secondaryUnit;
  const present = result.units;
  const primaryIndex = present.indexOf(primary);
  const secondaryIndex = present.indexOf(secondary);
  const between: TimeframeUnit[] =
    secondary === primary
      ? []
      : present.slice(primaryIndex + 1, secondaryIndex + 1);
  const below = present.slice(secondaryIndex + 1);

  const table = ["| | | | |", "| --- | --- | --- | --- |"];

  let lastPrimaryKey: string | null = null;
  let lastPeriodKey: string | null = null;
  for (const entry of result.entries) {
    const primaryValue = entry.values[primary];
    const primaryKey = `${primaryValue ?? ""}`;
    const periodKey = between
      .map((unit) => `${entry.values[unit] ?? ""}`)
      .join("|");
    const firstOfPrimary = primaryKey !== lastPrimaryKey;
    const firstOfPeriod = firstOfPrimary || periodKey !== lastPeriodKey;

    const primaryCell =
      firstOfPrimary && primaryValue !== undefined
        ? unitLabel(primaryValue, primary)
        : "";
    const periodCell =
      between.length > 0 ? unitValues(entry.values, between) : "";
    const cadenceCell =
      below.length > 0
        ? unitValues(entry.values, below, ":")
        : unitValues(entry.values, present, ":");

    const notePath = entry.path.replace(/\.md$/i, "");
    const alias = (notePath.split("/").pop() ?? entry.sceneTitle).replace(
      /\|/g,
      "\\|"
    );

    table.push(
      `| ${primaryCell} | ${
        firstOfPeriod ? periodCell : ""
      } | ${cadenceCell} | [[${notePath}\\|${alias}]] |`
    );

    lastPrimaryKey = primaryKey;
    lastPeriodKey = periodKey;
  }

  return `# Story Timeline\n\n${renderMermaid(result)}\n\n${table.join(
    "\n"
  )}\n`;
}
