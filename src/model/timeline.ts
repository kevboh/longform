import { normalizePath, TFile, type App } from "obsidian";
import { get } from "svelte/store";

import type { MultipleSceneDraft, TimeframeFormat } from "./types";
import { projectFolderPath, scenePath } from "./scene-navigation";
import { workflows } from "./stores";
import {
  compareTimeframes,
  isTimeframeParseError,
  parseTimeframe,
  primaryAndSecondaryUnits,
  type TimeframeParseError,
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
};

export type TimelineResult = {
  title: string;
  tagName: string;
  format: TimeframeFormat;
  /** The units every entry uses, stored once. */
  units: TimeframeUnit[];
  primaryUnit: TimeframeUnit;
  secondaryUnit: TimeframeUnit;
  entries: TimelineEntry[];
  missing: string[];
  errors: TimelineError[];
};

/**
 * Gathers every scene's timeframe, checks it against the project's format,
 * and keeps only the values that agree on granularity.
 */
export async function buildTimeline(
  app: App,
  draft: MultipleSceneDraft
): Promise<TimelineResult> {
  const tagName = draft.timeframeTagName;
  const format = draft.timeFormat;
  const entries: TimelineEntry[] = [];
  const missing: string[] = [];
  const errors: TimelineError[] = [];

  for (const scene of draft.scenes) {
    const file = app.vault.getAbstractFileByPath(
      scenePath(scene.title, draft, app.vault)
    );
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
      errors.push({
        sceneTitle: scene.title,
        kind: parsed.error.kind,
        message: messageForError(parsed.error, format),
      });
      continue;
    }

    entries.push({
      sceneTitle: scene.title,
      values: parsed.values,
    });
  }

  const consistent = keepConsistent(entries, errors);
  consistent.sort((a, b) => compareTimeframes(a.values, b.values));
  const [primaryUnit, secondaryUnit] = primaryAndSecondaryUnits(format);
  const units =
    consistent.length > 0
      ? (Object.keys(consistent[0].values) as TimeframeUnit[])
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

function messageForError(
  error: TimeframeParseError,
  format: TimeframeFormat
): string {
  switch (error.kind) {
    case "empty":
      return "has an empty timeframe value.";
    case "range":
      return `has an out-of-range ${error.unit} value (${error.value}).`;
    default:
      return `does not match the configured format (${FORMAT_LABELS[format]}).`;
  }
}

/**
 * Every value must use the same number of units. Values that differ from the
 * most common count are reported and dropped.
 */
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

/**
 * Writes the timeline beside the compiled manuscript. Returns without
 * creating anything when no scene has a timeframe value.
 */
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

  if (await isUnchanged(app, path, contents)) {
    return;
  }

  const folder = path.split("/").slice(0, -1).join("/");
  if (folder && !(await app.vault.adapter.exists(folder))) {
    await app.vault.createFolder(folder).catch(() => undefined);
  }

  await app.vault.adapter.write(path, contents);
}

async function isUnchanged(
  app: App,
  path: string,
  contents: string
): Promise<boolean> {
  if (!(await app.vault.adapter.exists(path))) {
    return false;
  }
  return (await app.vault.adapter.read(path)) === contents;
}

/**
 * The compiled manuscript's path with `_timeline` added before its extension.
 */
function timelinePath(app: App, draft: MultipleSceneDraft): string {
  const rawTarget = compiledTarget(draft).replace("$1", draft.title);
  const target = /\.\w+$/.test(rawTarget) ? rawTarget : `${rawTarget}.md`;
  const compiled = target.startsWith("/")
    ? normalizePath(target.slice(1))
    : normalizePath(`${projectFolderPath(draft, app.vault)}/${target}`);

  return compiled.replace(/(\.[^./]+)$/, "_timeline$1");
}

function compiledTarget(draft: MultipleSceneDraft): string {
  const workflow = draft.workflow ? get(workflows)[draft.workflow] : undefined;
  const step = workflow?.steps.find(
    (candidate) => candidate.description.canonicalID === "write-to-note"
  );
  const target = step?.optionValues?.["target"];

  if (typeof target === "string" && target.trim().length > 0) {
    return target.trim();
  }
  return DEFAULT_TARGET;
}

/**
 * Rebuilds a readable value from a unit map, using the shared unit order.
 */
function formatValues(values: TimeframeValues, units: TimeframeUnit[]): string {
  if (values.number !== undefined) {
    return `${values.number}`;
  }

  const parts: string[] = [];
  if (values.epoch !== undefined) {
    parts.push(`${values.epoch}`);
  }

  const date = units
    .filter((unit) => unit === "day" || unit === "month" || unit === "year")
    .map((unit) => values[unit])
    .filter((value): value is number => value !== undefined);
  if (date.length > 0) {
    parts.push(date.join("/"));
  }

  const time = units
    .filter((unit) => unit === "hour" || unit === "minute" || unit === "second")
    .map((unit) => values[unit])
    .filter((value): value is number => value !== undefined);
  if (time.length > 0) {
    parts.push(time.join(":"));
  }

  return parts.join(" ");
}

function renderTimeline(result: TimelineResult): string {
  const lines = [
    `# Timeline: ${result.title}`,
    "",
    `- **Time format:** ${FORMAT_LABELS[result.format]}`,
    `- **Timeframe tag:** \`${result.tagName}\``,
    `- **Primary unit:** ${result.primaryUnit}`,
    `- **Secondary unit:** ${result.secondaryUnit}`,
    "",
  ];

  if (result.errors.length > 0) {
    lines.push("## Problems", "");
    for (const error of result.errors) {
      lines.push(`- **${error.sceneTitle}** ${error.message}`);
    }
    lines.push("", "Fix these and the timeline will be rebuilt.");
    return lines.join("\n");
  }

  lines.push("## Scenes", "", "| Scene | Timeframe |", "| --- | --- |");
  for (const entry of result.entries) {
    lines.push(
      `| ${entry.sceneTitle} | ${formatValues(entry.values, result.units)} |`
    );
  }
  lines.push("");

  if (result.missing.length > 0) {
    lines.push("## Not on the timeline", "");
    for (const title of result.missing) {
      lines.push(`- ${title}`);
    }
    lines.push("");
  }

  lines.push(
    "## Data",
    "",
    "```json",
    JSON.stringify(
      {
        units: result.units,
        primary: result.primaryUnit,
        secondary: result.secondaryUnit,
        scenes: result.entries.map((entry) => ({
          scene: entry.sceneTitle,
          values: entry.values,
        })),
      },
      null,
      2
    ),
    "```"
  );

  return lines.join("\n");
}
