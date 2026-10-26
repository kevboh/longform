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
  type ParsedTimeframe,
  type TimeframeParseError,
  type TimeframeUnit,
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
  raw: string;
  parsed: ParsedTimeframe;
};

export type TimelineResult = {
  title: string;
  tagName: string;
  format: TimeframeFormat;
  primaryUnit: TimeframeUnit;
  secondaryUnit: TimeframeUnit;
  entries: TimelineEntry[];
  missing: string[];
  errors: TimelineError[];
};

/**
 * Gathers every scene's timeframe value, checks it against the project's
 * format, and keeps only the values that agree on granularity.
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
      raw: `${raw}`.trim(),
      parsed: parsed.parsed,
    });
  }

  const consistent = keepConsistent(entries, errors);
  consistent.sort((a, b) => compareTimeframes(a.parsed, b.parsed));
  const [primaryUnit, secondaryUnit] = primaryAndSecondaryUnits(format);

  return {
    title: draft.title,
    tagName,
    format,
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
    const count = entry.parsed.units.length;
    counts.set(count, (counts.get(count) ?? 0) + 1);
  }
  if (counts.size <= 1) {
    return entries;
  }

  const reference = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const kept: TimelineEntry[] = [];

  for (const entry of entries) {
    if (entry.parsed.units.length === reference) {
      kept.push(entry);
    } else {
      errors.push({
        sceneTitle: entry.sceneTitle,
        kind: "inconsistent",
        message: `uses ${entry.parsed.units.length} time units, but the rest of the project uses ${reference}.`,
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
    lines.push(`| ${entry.sceneTitle} | ${entry.raw} |`);
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
      result.entries.map((entry) => ({
        scene: entry.sceneTitle,
        raw: entry.raw,
        units: entry.parsed.units,
        values: entry.parsed.values,
      })),
      null,
      2
    ),
    "```"
  );

  return lines.join("\n");
}
