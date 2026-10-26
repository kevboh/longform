import { describe, expect, it } from "vitest";
import { TFile } from "obsidian";
import { buildTimeline, writeTimeline } from "../src/model/timeline";
import { workflows } from "../src/model/stores";
import {
  isTimeframeFormat,
  type MultipleSceneDraft,
  type TimeframeFormat,
} from "../src/model/types";

const makeFile = (path: string, parentPath: string): TFile =>
  new (TFile as unknown as new (
    path: string,
    parentPath: string
  ) => TFile)(path, parentPath);

type SceneSpec = { name: string; value?: unknown; indent?: number };

type ProjectOptions = {
  format?: TimeframeFormat;
  tag?: string;
  scenes: SceneSpec[];
  target?: string | null;
  title?: string;
  workflow?: string | null;
};

function makeProject(options: ProjectOptions) {
  const title = options.title ?? "My Book";
  const folder = "Novels/My Book";
  const indexPath = `${folder}/${title}.md`;
  const sceneFolder = "Scenes";
  const tag = options.tag ?? "timeframe";

  const files = new Map<string, { file: TFile; frontmatter: Record<string, unknown> }>();
  files.set(indexPath, { file: makeFile(indexPath, folder), frontmatter: {} });

  for (const scene of options.scenes) {
    const path = `${folder}/${sceneFolder}/${scene.name}.md`;
    const frontmatter: Record<string, unknown> = {};
    if (scene.value !== undefined) {
      frontmatter[tag] = scene.value;
    }
    files.set(path, {
      file: makeFile(path, `${folder}/${sceneFolder}`),
      frontmatter,
    });
  }

  const output = new Map<string, string>();
  const writes: string[] = [];

  const app = {
    vault: {
      getAbstractFileByPath: (path: string): TFile | null =>
        files.get(path)?.file ?? null,
      adapter: {
        exists: async (path: string): Promise<boolean> => output.has(path),
        read: async (path: string): Promise<string> => output.get(path) ?? "",
        write: async (path: string, contents: string): Promise<void> => {
          writes.push(path);
          output.set(path, contents);
        },
      },
      createFolder: async (): Promise<void> => undefined,
    },
    metadataCache: {
      getFileCache: (
        file: TFile
      ): { frontmatter?: Record<string, unknown> } =>
        files.get(file.path)?.frontmatter
          ? { frontmatter: files.get(file.path)!.frontmatter }
          : {},
    },
  };

  const draft: MultipleSceneDraft = {
    format: "scenes",
    title,
    titleInFrontmatter: true,
    draftTitle: null,
    vaultPath: indexPath,
    workflow: options.workflow === undefined ? "standard" : options.workflow,
    sceneFolder,
    scenes: options.scenes.map((scene) => ({
      title: scene.name,
      indent: scene.indent ?? 0,
    })),
    ignoredFiles: [],
    unknownFiles: [],
    sceneTemplate: null,
    timeframeTagName: tag,
    timeFormat: isTimeframeFormat(options.format)
      ? options.format
      : "datetime",
  };

  const target = options.target === undefined ? "manuscript.md" : options.target;
  workflows.set({
    standard: {
      name: "standard",
      description: "",
      steps:
        target === null
          ? []
          : [
              {
                id: "write-to-note",
                description: { canonicalID: "write-to-note" },
                optionValues: { target },
              },
            ],
    },
  } as any);

  return { app: app as never, draft, output, writes, files, indexPath };
}

async function runProject(options: ProjectOptions) {
  const project = makeProject(options);
  const result = await buildTimeline(project.app, project.draft);
  await writeTimeline(project.app, project.draft, result);
  const [entry] = [...project.output.entries()];
  return {
    ...project,
    result,
    path: entry?.[0],
    contents: entry?.[1] ?? "",
  };
}

function rows(contents: string): string[] {
  const lines = contents.split("\n");
  const header = lines.indexOf("| --- | --- |");
  if (header < 0) {
    return [];
  }
  const result: string[] = [];
  for (let i = header + 1; i < lines.length && lines[i].startsWith("| "); i++) {
    result.push(lines[i]);
  }
  return result;
}

function dataBlock(contents: string): unknown {
  const match = contents.match(/```json\n([\s\S]*?)\n```/);
  return match ? JSON.parse(match[1]) : null;
}

const VALID = "04/03/2026 09:30:00";

describe("A. happy path by format", () => {
  it("T01 epoch day-first", async () => {
    const run = await runProject({
      format: "epoch-datetime-dmy",
      scenes: [
        { name: "A", value: "1 04/03/2026 09:30:15" },
        { name: "B", value: "2 20/12/2023 16:00:00" },
        { name: "C", value: "1 05/03/2026 08:00:00" },
      ],
    });
    expect(run.result.errors).toEqual([]);
    expect(rows(run.contents)).toEqual([
      "| A | 1 4/3/2026 9:30:15 |",
      "| C | 1 5/3/2026 8:0:0 |",
      "| B | 2 20/12/2023 16:0:0 |",
    ]);
    expect(run.result.units).toEqual([
      "epoch", "day", "month", "year", "hour", "minute", "second",
    ]);
  });

  it("T02 epoch month-first", async () => {
    const run = await runProject({
      format: "epoch-datetime-mdy",
      scenes: [
        { name: "A", value: "1 04/03/2026 09:30:15" },
        { name: "B", value: "2 12/20/2023 16:00:00" },
        { name: "C", value: "1 03/05/2026 08:00:00" },
      ],
    });
    expect(rows(run.contents)).toEqual([
      "| C | 1 3/5/2026 8:0:0 |",
      "| A | 1 4/3/2026 9:30:15 |",
      "| B | 2 12/20/2023 16:0:0 |",
    ]);
    expect(run.result.units).toEqual([
      "epoch", "month", "day", "year", "hour", "minute", "second",
    ]);
  });

  it("T03 datetime", async () => {
    const run = await runProject({
      scenes: [
        { name: "A", value: "04/03/2026 09:30:15" },
        { name: "B", value: "20/12/2023 16:00:00" },
        { name: "C", value: "05/03/2026 08:00:00" },
      ],
    });
    expect(rows(run.contents)).toEqual([
      "| B | 20/12/2023 16:0:0 |",
      "| A | 4/3/2026 9:30:15 |",
      "| C | 5/3/2026 8:0:0 |",
    ]);
    expect(run.result.units).toEqual([
      "day", "month", "year", "hour", "minute", "second",
    ]);
  });

  it("T04 time only", async () => {
    const run = await runProject({
      format: "time",
      scenes: [
        { name: "A", value: "09:30:15" },
        { name: "B", value: "16:00:00" },
        { name: "C", value: "08:00:00" },
      ],
    });
    expect(rows(run.contents)).toEqual([
      "| C | 8:0:0 |",
      "| A | 9:30:15 |",
      "| B | 16:0:0 |",
    ]);
    expect(run.result.units).toEqual(["hour", "minute", "second"]);
  });

  it("T05 chronological number", async () => {
    const run = await runProject({
      format: "number",
      scenes: [
        { name: "A", value: 3 },
        { name: "B", value: 1 },
        { name: "C", value: 2 },
      ],
    });
    expect(rows(run.contents)).toEqual(["| B | 1 |", "| C | 2 |", "| A | 3 |"]);
    expect(run.result.units).toEqual(["number"]);
    expect(run.result.primaryUnit).toBe("number");
  });
});

describe("B. partial values", () => {
  it("T06 datetime minutes", async () => {
    const run = await runProject({
      scenes: [
        { name: "A", value: "04/03/2026 09:30" },
        { name: "B", value: "05/03/2026 10:15" },
        { name: "C", value: "06/03/2026 11:00" },
      ],
    });
    expect(rows(run.contents)).toEqual([
      "| A | 4/3/2026 9:30 |",
      "| B | 5/3/2026 10:15 |",
      "| C | 6/3/2026 11:0 |",
    ]);
    expect(run.result.units).toEqual([
      "day", "month", "year", "hour", "minute",
    ]);
  });

  it("T07 datetime hours", async () => {
    const run = await runProject({
      scenes: [
        { name: "A", value: "04/03/2026 09" },
        { name: "B", value: "05/03/2026 10" },
        { name: "C", value: "06/03/2026 11" },
      ],
    });
    expect(rows(run.contents)).toEqual([
      "| A | 4/3/2026 9 |",
      "| B | 5/3/2026 10 |",
      "| C | 6/3/2026 11 |",
    ]);
    expect(run.result.units).toEqual(["day", "month", "year", "hour"]);
  });

  it("T08 datetime date only", async () => {
    const run = await runProject({
      scenes: [
        { name: "A", value: "04/03/2026" },
        { name: "B", value: "05/03/2026" },
        { name: "C", value: "06/03/2026" },
      ],
    });
    expect(rows(run.contents)).toEqual([
      "| A | 4/3/2026 |",
      "| B | 5/3/2026 |",
      "| C | 6/3/2026 |",
    ]);
    expect(run.result.units).toEqual(["day", "month", "year"]);
  });

  it("T15 time minutes", async () => {
    const run = await runProject({
      format: "time",
      scenes: [
        { name: "A", value: "09:30" },
        { name: "B", value: "16:00" },
        { name: "C", value: "08:00" },
      ],
    });
    expect(rows(run.contents)).toEqual([
      "| C | 8:0 |",
      "| A | 9:30 |",
      "| B | 16:0 |",
    ]);
    expect(run.result.units).toEqual(["hour", "minute"]);
  });
});

describe("C. wrong format", () => {
  const four = [
    { name: "A", value: VALID },
    { name: "B", value: VALID },
    { name: "C", value: VALID },
    { name: "D", value: VALID },
  ];

  it("T16 datetime rejects time only", async () => {
    const run = await runProject({ scenes: [...four, { name: "E", value: "09:30" }] });
    expect(run.contents).toContain(
      "- **E** does not match the configured format (Date time (dd/mm/yyyy hh:mm:ss))."
    );
    expect(run.contents).not.toContain("## Scenes");
  });

  it("T21 datetime rejects two-digit year", async () => {
    const run = await runProject({ scenes: [...four, { name: "E", value: "4/3/26 09:30" }] });
    expect(run.result.errors).toHaveLength(1);
  });

  it("T24 time rejects a fourth part", async () => {
    const run = await runProject({
      format: "time",
      scenes: [
        { name: "A", value: "09:30:00" },
        { name: "B", value: "09:30:00" },
        { name: "C", value: "09:30:00" },
        { name: "D", value: "09:30:00" },
        { name: "E", value: "09:30:15:00" },
      ],
    });
    expect(run.result.errors.map((e) => e.sceneTitle)).toEqual(["E"]);
  });

  it("T25 number rejects negative", async () => {
    const run = await runProject({
      format: "number",
      scenes: [
        { name: "A", value: 1 },
        { name: "B", value: 2 },
        { name: "C", value: 3 },
        { name: "D", value: 4 },
        { name: "E", value: -1 },
      ],
    });
    expect(run.result.errors.map((e) => e.sceneTitle)).toEqual(["E"]);
  });
});

describe("D. out-of-range values", () => {
  const four = [
    { name: "A", value: VALID },
    { name: "B", value: VALID },
    { name: "C", value: VALID },
    { name: "D", value: VALID },
  ];

  it.each([
    ["T26 month", "04/13/2026 09:30", "month", 13],
    ["T27 day", "32/03/2026 09:30", "day", 32],
    ["T28 hour", "04/03/2026 24:00", "hour", 24],
    ["T29 minute", "04/03/2026 09:60", "minute", 60],
    ["T30 second", "04/03/2026 09:30:60", "second", 60],
  ])("%s", async (_label, bad, unit, value) => {
    const run = await runProject({ scenes: [...four, { name: "E", value: bad }] });
    expect(run.contents).toContain(
      `- **E** has an out-of-range ${unit} value (${value}).`
    );
  });

  it("T37 reports two bad scenes in order", async () => {
    const run = await runProject({
      scenes: [
        { name: "A", value: "00/03/2026 09:30" },
        { name: "B", value: "04/00/2026 09:30" },
        { name: "C", value: VALID },
      ],
    });
    expect(run.result.errors.map((e) => e.message)).toEqual([
      "has an out-of-range day value (0).",
      "has an out-of-range month value (0).",
    ]);
  });

  it("T38 accepts 31 February (no calendar check)", async () => {
    const run = await runProject({
      scenes: [
        { name: "A", value: "31/02/2026 09:30" },
        { name: "B", value: "30/02/2026 09:30" },
      ],
    });
    expect(run.result.errors).toEqual([]);
  });

  it("T39 has no epoch or year range", async () => {
    const run = await runProject({
      format: "epoch-datetime-dmy",
      scenes: [
        { name: "A", value: "0 01/01/2000 00:00:00" },
        { name: "B", value: "999999 31/12/9999 23:59:59" },
      ],
    });
    expect(run.result.errors).toEqual([]);
  });
});

describe("E. inconsistent granularity", () => {
  it("T41 minority is reported and dropped", async () => {
    const run = await runProject({
      scenes: [
        { name: "A", value: VALID },
        { name: "B", value: VALID },
        { name: "C", value: VALID },
        { name: "D", value: VALID },
        { name: "E", value: "06/03/2026" },
      ],
    });
    expect(run.contents).toContain(
      "- **E** uses 3 time units, but the rest of the project uses 6."
    );
  });

  it("T43 tie uses the first scene's count", async () => {
    const run = await runProject({
      scenes: [
        { name: "A", value: VALID },
        { name: "B", value: "05/03/2026" },
      ],
    });
    expect(run.contents).toContain(
      "- **B** uses 3 time units, but the rest of the project uses 6."
    );
  });

  it("T48 format errors precede inconsistent entries", async () => {
    const run = await runProject({
      scenes: [
        { name: "A", value: VALID },
        { name: "B", value: "05/03/2026" },
        { name: "C", value: "09:30" },
      ],
    });
    expect(run.result.errors.map((e) => e.sceneTitle)).toEqual(["C", "B"]);
  });
});

describe("F. missing and empty timelines", () => {
  it("T49 missing scenes are listed, not errors", async () => {
    const run = await runProject({
      scenes: [
        { name: "A", value: "04/03/2026 09:30" },
        { name: "B", value: "05/03/2026 09:30" },
        { name: "C" },
        { name: "D" },
        { name: "E" },
      ],
    });
    expect(run.result.errors).toEqual([]);
    expect(run.result.missing).toEqual(["C", "D", "E"]);
    expect(run.contents).toContain("## Not on the timeline");
  });

  it("T52 creates no file when nothing has a timeframe", async () => {
    const run = await runProject({ scenes: [{ name: "A" }, { name: "B" }] });
    expect(run.output.size).toBe(0);
    expect(run.writes).toEqual([]);
  });

  it("T53 leaves an existing file untouched when values are removed", async () => {
    const project = makeProject({ scenes: [{ name: "A" }] });
    project.output.set("Novels/My Book/manuscript_timeline.md", "OLD");
    // Rebuild after seeding the output map.
    const result = await buildTimeline(project.app, project.draft);
    await writeTimeline(project.app, project.draft, result);
    expect(project.output.get("Novels/My Book/manuscript_timeline.md")).toBe("OLD");
  });

  it("T57 empty array counts as missing", async () => {
    const run = await runProject({
      scenes: [
        { name: "A", value: "04/03/2026 09:30" },
        { name: "B", value: [] },
      ],
    });
    expect(run.result.missing).toEqual(["B"]);
  });

  it("T58 numeric zero is a format error", async () => {
    const run = await runProject({ scenes: [{ name: "A", value: 0 }] });
    expect(run.result.errors[0].kind).toBe("format");
  });

  it("T59 false and object are empty errors", async () => {
    const run = await runProject({
      scenes: [
        { name: "A", value: false },
        { name: "B", value: {} },
        { name: "C", value: "04/03/2026 09:30" },
      ],
    });
    expect(run.result.errors.map((e) => e.sceneTitle)).toEqual(["A", "B"]);
    expect(run.result.errors[0].message).toBe("has an empty timeframe value.");
  });
});

describe("G. mixed valid and invalid", () => {
  it("T60 reports only the bad scenes", async () => {
    const run = await runProject({
      scenes: [
        { name: "A", value: VALID },
        { name: "B", value: VALID },
        { name: "C", value: "32/03/2026 09:30" },
        { name: "D", value: "09:30" },
        { name: "E" },
      ],
    });
    expect(run.result.errors.map((e) => e.sceneTitle)).toEqual(["C", "D"]);
    expect(run.contents).not.toContain("## Scenes");
  });
});

describe("H. ordering", () => {
  it("T62 flashback sorts first", async () => {
    const run = await runProject({
      scenes: [
        { name: "A", value: "10/06/2026 12:00" },
        { name: "B", value: "15/09/1999 08:00" },
        { name: "C", value: "11/06/2026 09:00" },
      ],
    });
    expect(run.result.entries.map((e) => e.sceneTitle)).toEqual(["B", "A", "C"]);
  });

  it("T63 epoch outranks calendar date", async () => {
    const run = await runProject({
      format: "epoch-datetime-dmy",
      scenes: [
        { name: "A", value: "2 01/01/2000" },
        { name: "B", value: "1 31/12/2026" },
      ],
    });
    expect(run.result.entries.map((e) => e.sceneTitle)).toEqual(["B", "A"]);
  });

  it("T66 equal values keep index order", async () => {
    const run = await runProject({
      scenes: [
        { name: "A", value: "04/03/2026 09:30" },
        { name: "B", value: "04/03/2026 09:30" },
        { name: "C", value: "05/03/2026 09:30" },
      ],
    });
    expect(run.result.entries.map((e) => e.sceneTitle)).toEqual(["A", "B", "C"]);
  });
});

describe("I. number format", () => {
  it("T68 numeric ordering", async () => {
    const run = await runProject({
      format: "number",
      scenes: [
        { name: "A", value: 10 },
        { name: "B", value: 2 },
        { name: "C", value: 33 },
        { name: "D", value: 1 },
      ],
    });
    expect(rows(run.contents)).toEqual([
      "| D | 1 |",
      "| B | 2 |",
      "| A | 10 |",
      "| C | 33 |",
    ]);
  });

  it("T69 quoted and unquoted integers", async () => {
    const run = await runProject({
      format: "number",
      scenes: [
        { name: "A", value: 3 },
        { name: "B", value: "1" },
        { name: "C", value: 20 },
        { name: "D", value: "2" },
      ],
    });
    expect(run.result.errors).toEqual([]);
    expect(run.result.entries.map((e) => e.sceneTitle)).toEqual(["B", "D", "A", "C"]);
  });

  it("T70 leading zeros", async () => {
    const run = await runProject({
      format: "number",
      scenes: [
        { name: "A", value: "007" },
        { name: "B", value: 7 },
        { name: "C", value: "010" },
      ],
    });
    expect(rows(run.contents)).toEqual(["| A | 7 |", "| B | 7 |", "| C | 10 |"]);
  });

  it("T71 zero is valid", async () => {
    const run = await runProject({
      format: "number",
      scenes: [
        { name: "A", value: 0 },
        { name: "B", value: 1 },
      ],
    });
    expect(rows(run.contents)).toEqual(["| A | 0 |", "| B | 1 |"]);
  });

  it("T73 quoted decimal is a format error", async () => {
    const run = await runProject({ format: "number", scenes: [{ name: "A", value: "3.0" }] });
    expect(run.result.errors[0].kind).toBe("format");
  });

  it("T75 large numbers", async () => {
    const run = await runProject({
      format: "number",
      scenes: [
        { name: "A", value: 1000000 },
        { name: "B", value: 999999 },
      ],
    });
    expect(run.result.entries.map((e) => e.sceneTitle)).toEqual(["B", "A"]);
  });
});

describe("J. output paths", () => {
  it.each([
    ["T76", "Build/$1.md", "Novels/My Book/Build/My Book_timeline.md"],
    ["T77", "manuscript.md", "Novels/My Book/manuscript_timeline.md"],
    ["T78", "/out/$1.md", "out/My Book_timeline.md"],
    ["T79", "/manuscript.md", "manuscript_timeline.md"],
    ["T80", "Build/$1", "Novels/My Book/Build/My Book_timeline.md"],
    ["T81", "Build/$1.txt", "Novels/My Book/Build/My Book_timeline.txt"],
    ["T82", "$1-draft.md", "Novels/My Book/My Book-draft_timeline.md"],
    ["T83", "Build/$1-$1.md", "Novels/My Book/Build/My Book-$1_timeline.md"],
    ["T88", "Build/Part 1/$1.md", "Novels/My Book/Build/Part 1/My Book_timeline.md"],
  ])("%s target %s", async (_id, target, expected) => {
    const run = await runProject({
      target,
      scenes: [{ name: "A", value: "04/03/2026 09:30" }],
    });
    expect(run.path).toBe(expected);
  });

  it("T84 null workflow falls back", async () => {
    const run = await runProject({
      workflow: null,
      scenes: [{ name: "A", value: "04/03/2026 09:30" }],
    });
    expect(run.path).toBe("Novels/My Book/manuscript_timeline.md");
  });

  it("T85 workflow without Save as Note falls back", async () => {
    const run = await runProject({
      target: null,
      scenes: [{ name: "A", value: "04/03/2026 09:30" }],
    });
    expect(run.path).toBe("Novels/My Book/manuscript_timeline.md");
  });

  it("T86 whitespace target falls back", async () => {
    const run = await runProject({
      target: "   ",
      scenes: [{ name: "A", value: "04/03/2026 09:30" }],
    });
    expect(run.path).toBe("Novels/My Book/manuscript_timeline.md");
  });
});

describe("K. data block", () => {
  it("T89 exact shape", async () => {
    const run = await runProject({
      scenes: [
        { name: "A", value: "04/03/2026 09:30" },
        { name: "B", value: "05/03/2026 10:15" },
      ],
    });
    expect(dataBlock(run.contents)).toEqual({
      units: ["day", "month", "year", "hour", "minute"],
      primary: "year",
      secondary: "month",
      scenes: [
        { scene: "A", values: { day: 4, month: 3, year: 2026, hour: 9, minute: 30 } },
        { scene: "B", values: { day: 5, month: 3, year: 2026, hour: 10, minute: 15 } },
      ],
    });
  });

  it("T90 units appear once", async () => {
    const run = await runProject({
      scenes: [
        { name: "A", value: VALID },
        { name: "B", value: "04/03/2025 09:30:00" },
        { name: "C", value: "04/03/2024 09:30:00" },
      ],
    });
    const data = dataBlock(run.contents) as { scenes: unknown[] };
    expect(data.scenes.every((s) => !("units" in (s as object)))).toBe(true);
  });

  it("T94 number shape", async () => {
    const run = await runProject({ format: "number", scenes: [{ name: "A", value: 7 }] });
    expect(dataBlock(run.contents)).toEqual({
      units: ["number"],
      primary: "number",
      secondary: "number",
      scenes: [{ scene: "A", values: { number: 7 } }],
    });
  });
});

describe("M. scope", () => {
  it("T120 notes are ignored", async () => {
    const run = await runProject({
      scenes: [
        { name: "A", value: "04/03/2026 09:30" },
        { name: "B", value: "05/03/2026 09:30" },
      ],
    });
    expect(run.result.entries.map((e) => e.sceneTitle)).toEqual(["A", "B"]);
  });

  it("T124 absent scene files are skipped", async () => {
    const project = makeProject({
      scenes: [
        { name: "A", value: "04/03/2026 09:30" },
        { name: "B" },
      ],
    });
    project.files.delete("Novels/My Book/Scenes/B.md");
    const result = await buildTimeline(project.app, project.draft);
    expect(result.missing).toEqual([]);
    expect(result.entries.map((e) => e.sceneTitle)).toEqual(["A"]);
  });
});

describe("N. edge cases", () => {
  it("T129 trims whitespace", async () => {
    const run = await runProject({
      scenes: [{ name: "A", value: " 04/03/2026 09:30 " }],
    });
    expect(rows(run.contents)).toEqual(["| A | 4/3/2026 9:30 |"]);
  });

  it("T130 accepts multiple spaces", async () => {
    const run = await runProject({
      scenes: [{ name: "A", value: "04/03/2026   09:30" }],
    });
    expect(run.result.errors).toEqual([]);
  });

  it("T131 accepts a tab separator", async () => {
    const run = await runProject({
      scenes: [{ name: "A", value: "04/03/2026\t09:30" }],
    });
    expect(run.result.errors).toEqual([]);
  });

  it("T132 drops leading zeros in display", async () => {
    const run = await runProject({
      scenes: [{ name: "A", value: "04/03/2026 09:05:07" }],
    });
    expect(rows(run.contents)).toEqual(["| A | 4/3/2026 9:5:7 |"]);
  });

  it("T134 one scene", async () => {
    const run = await runProject({
      scenes: [{ name: "A", value: "04/03/2026 09:30" }],
    });
    expect(rows(run.contents)).toEqual(["| A | 4/3/2026 9:30 |"]);
    expect(run.contents).not.toContain("## Not on the timeline");
  });

  it("T135 one scene with no value creates no file", async () => {
    const run = await runProject({ scenes: [{ name: "A" }] });
    expect(run.output.size).toBe(0);
  });

  it("T136 empty scene list creates no file", async () => {
    const run = await runProject({ scenes: [] });
    expect(run.output.size).toBe(0);
  });

  it("T138 invalid format falls back to datetime", async () => {
    const run = await runProject({
      format: "bogus" as TimeframeFormat,
      scenes: [{ name: "A", value: "04/03/2026 09:30" }],
    });
    expect(run.result.format).toBe("datetime");
  });

  it("T140 zero time units are kept", async () => {
    const run = await runProject({
      format: "time",
      scenes: [
        { name: "A", value: "0:0:0" },
        { name: "B", value: "09:30:00" },
      ],
    });
    expect(rows(run.contents)).toEqual(["| A | 0:0:0 |", "| B | 9:30:0 |"]);
  });

  it("T141 escapes a pipe in a scene title", async () => {
    const run = await runProject({
      scenes: [{ name: "A | B", value: "04/03/2026 09:30" }],
    });
    expect(rows(run.contents)).toEqual(["| A \\| B | 4/3/2026 9:30 |"]);
  });

  it("T142 defined zero minute is kept", async () => {
    const run = await runProject({
      scenes: [
        { name: "A", value: "04/03/2026 00:30" },
        { name: "B", value: "04/03/2026 09:00" },
      ],
    });
    expect(rows(run.contents)).toEqual([
      "| A | 4/3/2026 0:30 |",
      "| B | 4/3/2026 9:0 |",
    ]);
  });
});

describe("O. compiled manuscript", () => {
  it("T143 never overwrites the compiled manuscript", async () => {
    const project = makeProject({
      scenes: [{ name: "A", value: "04/03/2026 09:30" }],
    });
    project.output.set("Novels/My Book/manuscript.md", "MANUSCRIPT");
    const result = await buildTimeline(project.app, project.draft);
    await writeTimeline(project.app, project.draft, result);
    expect(project.output.get("Novels/My Book/manuscript.md")).toBe("MANUSCRIPT");
    expect(project.output.get("Novels/My Book/manuscript_timeline.md")).toContain(
      "| A | 4/3/2026 9:30 |"
    );
  });

  it("T146 appends the suffix even if the name already has it", async () => {
    const run = await runProject({
      target: "manuscript_timeline.md",
      scenes: [{ name: "A", value: "04/03/2026 09:30" }],
    });
    expect(run.path).toBe("Novels/My Book/manuscript_timeline_timeline.md");
  });
});

describe("Mermaid timeline", () => {
  it("uses timeline sections and periods, with scenes in order", async () => {
    const run = await runProject({
      scenes: [
        { name: "A", value: "04/03/2026 09:30" },
        { name: "B", value: "04/03/2026 10:00" },
        { name: "C", value: "05/03/2026 08:00" },
        { name: "D", value: "20/12/2023 16:00" },
      ],
    });

    expect(run.contents.startsWith("```mermaid\ntimeline")).toBe(true);
    expect(run.contents).toContain("    section 2023");
    expect(run.contents).toContain("    section 2026");
    expect(run.contents).toContain("        12 : D - 20/12/2023 16.00");
    expect(run.contents).toContain("        03 : A - 04/03/2026 09.30");

    const a = run.contents.indexOf("A - 04/03/2026 09.30");
    const b = run.contents.indexOf("B - 04/03/2026 10.00");
    const c = run.contents.indexOf("C - 05/03/2026 08.00");
    expect(a).toBeGreaterThan(-1);
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
  });
});

describe("Container scenes", () => {
  it("skips scenes that have children", async () => {
    const run = await runProject({
      scenes: [
        { name: "Act", value: "04/03/2026 09:30", indent: 0 },
        { name: "Scene A", value: "05/03/2026 09:30", indent: 1 },
        { name: "Scene B", value: "06/03/2026 09:30", indent: 0 },
      ],
    });
    expect(run.result.entries.map((e) => e.sceneTitle)).toEqual([
      "Scene A",
      "Scene B",
    ]);
    expect(run.result.missing).toEqual([]);
    expect(run.contents).not.toContain("| Act |");
  });
});

describe("The Clearing (real values)", () => {
  it("builds cleanly, sorts the flashback first, and lists the title page", async () => {
    const run = await runProject({
      title: "The Clearing",
      target: "Build/$1.md",
      scenes: [
        { name: "00-00 Title Page" },
        { name: "01-01 The Empty Cabin", value: "04/03/2026 09:30" },
        { name: "01-02 Morning Rounds", value: "04/03/2026 09:45" },
        { name: "01-03 The Trail", value: "04/03/2026 10:05" },
        { name: "01-04 Her Knife", value: "20/12/2023 16:00" },
        { name: "01-05 Into the Forest", value: "04/03/2026 10:25" },
        { name: "01-06 The Run", value: "04/03/2026 11:10" },
        { name: "01-07 The Sound", value: "04/03/2026 11:20" },
      ],
    });

    expect(run.result.errors).toEqual([]);
    expect(run.result.missing).toEqual(["00-00 Title Page"]);
    expect(run.result.entries.map((e) => e.sceneTitle)).toEqual([
      "01-04 Her Knife",
      "01-01 The Empty Cabin",
      "01-02 Morning Rounds",
      "01-03 The Trail",
      "01-05 Into the Forest",
      "01-06 The Run",
      "01-07 The Sound",
    ]);
    expect(run.result.primaryUnit).toBe("year");
    expect(run.result.secondaryUnit).toBe("month");
    expect(run.path).toBe("Novels/My Book/Build/The Clearing_timeline.md");
    expect(run.contents).toContain("## Not on the timeline");
    expect(run.contents).toContain("- 00-00 Title Page");
  });
});
