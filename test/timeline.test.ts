import { describe, expect, it } from "vitest";

import { buildTimeline, writeTimeline } from "../src/model/timeline";
import type { TimeframeFormat } from "../src/model/types";
import {
  dataBlock,
  makeProject,
  mermaidBlock,
  rows,
  runProject,
} from "./helpers/project";

const FORMAT_SAMPLES: Record<TimeframeFormat, string | number> = {
  datetime: "04/03/2026 09:30:00",
  "epoch-datetime-dmy": "1 04/03/2026 09:30:00",
  "epoch-datetime-mdy": "1 03/04/2026 09:30:00",
  time: "09:30:00",
  number: 1,
};

describe("container scenes", () => {
  it("skips every scene that has children, at any depth", async () => {
    const run = await runProject({
      scenes: [
        { name: "Act", value: "01/01/2026 00:00", indent: 0 },
        { name: "Chapter", value: "01/01/2026 00:00", indent: 1 },
        { name: "Scene A", value: "04/03/2026 09:30", indent: 2 },
        { name: "Scene B", value: "05/03/2026 09:30", indent: 0 },
      ],
    });

    expect(run.result.entries.map((e) => e.sceneTitle)).toEqual([
      "Scene A",
      "Scene B",
    ]);
    expect(run.result.missing).toEqual([]);
    expect(run.contents).not.toContain("| Act |");
    expect(run.contents).not.toContain("| Chapter |");
  });

  it("does not report a container without a timeframe as missing", async () => {
    const run = await runProject({
      scenes: [
        { name: "Act", indent: 0 },
        { name: "Scene A", value: "04/03/2026 09:30", indent: 1 },
      ],
    });
    expect(run.result.missing).toEqual([]);
    expect(run.contents).not.toContain("## Not on the timeline");
  });

  it("skips a container even when it carries a timeframe", async () => {
    const run = await runProject({
      scenes: [
        { name: "Act", value: "04/03/2026 09:30", indent: 0 },
        { name: "Scene A", value: "05/03/2026 09:30", indent: 1 },
      ],
    });
    expect(run.result.entries.map((e) => e.sceneTitle)).toEqual(["Scene A"]);
  });
});

describe("missing and absent files", () => {
  it("silently skips a leaf whose file is absent", async () => {
    const project = makeProject({
      scenes: [
        { name: "A", value: "04/03/2026 09:30" },
        { name: "B" },
      ],
    });
    project.files.delete(`${project.folder}/${project.sceneFolder}/B.md`);
    const result = await buildTimeline(project.app, project.draft);
    expect(result.entries.map((e) => e.sceneTitle)).toEqual(["A"]);
    expect(result.missing).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it("lists scenes with no value under Not on the timeline in index order", async () => {
    const run = await runProject({
      scenes: [
        { name: "A", value: "04/03/2026 09:30" },
        { name: "B" },
        { name: "C", value: "   " },
        { name: "D", value: null },
      ],
    });
    expect(run.result.missing).toEqual(["B", "C", "D"]);
    expect(run.contents).toContain("- B\n- C\n- D");
  });
});

describe("writing rules", () => {
  it("creates nothing when there are no entries and no errors", async () => {
    const run = await runProject({
      scenes: [{ name: "A" }, { name: "B" }],
    });
    expect(run.output.size).toBe(0);
    expect(run.writes).toEqual([]);
  });

  it("leaves a stale file untouched when values disappear", async () => {
    const project = makeProject({ scenes: [{ name: "A" }] });
    const path = "Novels/My Book/manuscript_timeline.md";
    project.output.set(path, "OLD");
    const result = await buildTimeline(project.app, project.draft);
    await writeTimeline(project.app, project.draft, result);
    expect(project.output.get(path)).toBe("OLD");
    expect(project.writes).toEqual([]);
  });

  it("does not rewrite identical content", async () => {
    const project = makeProject({
      scenes: [{ name: "A", value: "04/03/2026 09:30" }],
    });
    const result = await buildTimeline(project.app, project.draft);
    await writeTimeline(project.app, project.draft, result);
    const writes = project.writes.length;
    await writeTimeline(project.app, project.draft, result);
    expect(project.writes.length).toBe(writes);
  });

  it("overwrites when content changes", async () => {
    const project = makeProject({
      scenes: [{ name: "A", value: "04/03/2026 09:30" }],
    });
    const first = await buildTimeline(project.app, project.draft);
    await writeTimeline(project.app, project.draft, first);

    project.files.get(`${project.folder}/${project.sceneFolder}/A.md`)!
      .frontmatter.timeframe = "05/03/2026 09:30";
    const second = await buildTimeline(project.app, project.draft);
    await writeTimeline(project.app, project.draft, second);

    expect(project.writes.length).toBe(2);
    expect(project.output.get("Novels/My Book/manuscript_timeline.md")).toContain(
      "| A | 5/3/2026 9:30 |"
    );
  });
});

describe("errors suppress success sections", () => {
  it("writes only the header and Problems when any value is invalid", async () => {
    const run = await runProject({
      scenes: [
        { name: "A", value: "04/03/2026 09:30" },
        { name: "B", value: "09:30" },
      ],
    });
    expect(run.contents).toContain("## Problems");
    expect(run.contents).not.toContain("## Scenes");
    expect(run.contents).not.toContain("## Data");
    expect(run.contents).not.toContain("mermaid");
  });

  it("orders format errors before inconsistent entries", async () => {
    const run = await runProject({
      scenes: [
        { name: "A", value: "04/03/2026 09:30:00" },
        { name: "B", value: "05/03/2026" },
        { name: "C", value: "09:30" },
      ],
    });
    expect(run.result.errors.map((e) => e.sceneTitle)).toEqual(["C", "B"]);
  });

  it("reports range errors with the unit and value", async () => {
    const run = await runProject({
      scenes: [
        { name: "A", value: "04/03/2026 24:00" },
        { name: "B", value: "04/13/2026 09:30" },
      ],
    });
    expect(run.result.errors.map((e) => e.message)).toEqual([
      "has an out-of-range hour value (24).",
      "has an out-of-range month value (13).",
    ]);
  });
});

describe("consistency", () => {
  it("drops the minority granularity and reports each outlier", async () => {
    const run = await runProject({
      scenes: [
        { name: "A", value: "04/03/2026 09:30:00" },
        { name: "B", value: "05/03/2026 09:30:00" },
        { name: "C", value: "06/03/2026 09:30:00" },
        { name: "D", value: "07/03/2026" },
      ],
    });
    expect(run.result.entries).toHaveLength(3);
    expect(run.result.errors[0].sceneTitle).toBe("D");
  });

  it("breaks ties by the first scene's count", async () => {
    const run = await runProject({
      scenes: [
        { name: "A", value: "04/03/2026" },
        { name: "B", value: "05/03/2026 09:30:00" },
      ],
    });
    expect(run.result.errors[0].sceneTitle).toBe("B");
    expect(run.result.errors[0].message).toContain("uses 6 time units");
  });
});

describe("ordering", () => {
  it("sorts flashbacks first and flashforwards last", async () => {
    const run = await runProject({
      scenes: [
        { name: "Present", value: "15/03/2024 09:00" },
        { name: "Past", value: "05/09/1988 16:30" },
        { name: "Future", value: "31/10/2027 23:50" },
      ],
    });
    expect(run.result.entries.map((e) => e.sceneTitle)).toEqual([
      "Past",
      "Present",
      "Future",
    ]);
  });

  it("keeps index order for identical timestamps", async () => {
    const run = await runProject({
      scenes: [
        { name: "A", value: "04/03/2026 09:30" },
        { name: "B", value: "04/03/2026 09:30" },
        { name: "C", value: "04/03/2026 09:30" },
      ],
    });
    expect(run.result.entries.map((e) => e.sceneTitle)).toEqual(["A", "B", "C"]);
  });
});

describe("data block", () => {
  it("stores units once and keeps scene values as dictionaries", async () => {
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
        {
          scene: "A",
          values: { day: 4, month: 3, year: 2026, hour: 9, minute: 30 },
        },
        {
          scene: "B",
          values: { day: 5, month: 3, year: 2026, hour: 10, minute: 15 },
        },
      ],
    });
  });

  it("retains defined zero units", async () => {
    const run = await runProject({
      scenes: [{ name: "A", value: "04/03/2026 00:00" }],
    });
    const data = dataBlock(run.contents) as {
      scenes: { values: Record<string, number> }[];
    };
    expect(data.scenes[0].values).toMatchObject({ hour: 0, minute: 0 });
  });
});

describe("Mermaid timeline", () => {
  it("starts with a timeline block and uses sections, periods, and events", async () => {
    const run = await runProject({
      scenes: [
        { name: "A", value: "04/03/2026 09:30" },
        { name: "B", value: "04/03/2026 10:00" },
        { name: "C", value: "05/03/2026 08:00" },
        { name: "D", value: "20/12/2023 16:00" },
      ],
    });

    expect(run.contents.startsWith("```mermaid\ntimeline\n")).toBe(true);
    expect(mermaidBlock(run.contents)).toEqual([
      "timeline",
      "    title My Book",
      "    section 2023",
      "        12 : D - 20/12/2023 16.00",
      "    section 2026",
      "        03 : A - 04/03/2026 09.30",
      "           : B - 04/03/2026 10.00",
      "           : C - 05/03/2026 08.00",
    ]);
  });

  it("uses sane section and period labels for every format", async () => {
    const expectations: Record<TimeframeFormat, [string, string]> = {
      datetime: ["2026", "03"],
      "epoch-datetime-dmy": ["1", "2026"],
      "epoch-datetime-mdy": ["1", "2026"],
      time: ["09", "30"],
      number: ["Timeline", "1"],
    };

    for (const [format, [section, period]] of Object.entries(expectations)) {
      const run = await runProject({
        format: format as TimeframeFormat,
        scenes: [
          { name: "A", value: FORMAT_SAMPLES[format as TimeframeFormat] },
        ],
      });
      expect(run.contents, format).toContain(`    section ${section}`);
      expect(run.contents, format).toContain(`        ${period} : A - `);
    }
  });

  it("sanitizes colons in titles and keeps pipes in Mermaid", async () => {
    const run = await runProject({
      title: "My: Book",
      scenes: [
        { name: "A: B | C", value: "04/03/2026 09:30" },
      ],
    });
    expect(run.contents).toContain("    title My - Book");
    expect(run.contents).toContain("A - B | C - 04/03/2026 09.30");
  });

  it("uses a Timeline section for the number format", async () => {
    const run = await runProject({
      format: "number",
      scenes: [
        { name: "A", value: 2 },
        { name: "B", value: 1 },
      ],
    });
    expect(mermaidBlock(run.contents)).toEqual([
      "timeline",
      "    title My Book",
      "    section Timeline",
      "        1 : B - 1",
      "        2 : A - 2",
    ]);
  });
});

describe("output paths", () => {
  it.each([
    ["Build/$1.md", "Novels/My Book/Build/My Book_timeline.md"],
    ["manuscript.md", "Novels/My Book/manuscript_timeline.md"],
    ["/out/$1.md", "out/My Book_timeline.md"],
    ["/manuscript.md", "manuscript_timeline.md"],
    ["Build/$1", "Novels/My Book/Build/My Book_timeline.md"],
    ["Build/$1.txt", "Novels/My Book/Build/My Book_timeline.txt"],
    ["$1-draft.md", "Novels/My Book/My Book-draft_timeline.md"],
    ["Build/$1-$1.md", "Novels/My Book/Build/My Book-$1_timeline.md"],
    ["Build/Part 1/$1.md", "Novels/My Book/Build/Part 1/My Book_timeline.md"],
    ["Build/$1.v2.md", "Novels/My Book/Build/My Book.v2_timeline.md"],
    ["manuscript_timeline.md", "Novels/My Book/manuscript_timeline_timeline.md"],
  ])("resolves %s", async (target, expected) => {
    const run = await runProject({
      target,
      scenes: [{ name: "A", value: "04/03/2026 09:30" }],
    });
    expect(run.path).toBe(expected);
  });

  it("falls back without a workflow, a step, or a target", async () => {
    for (const options of [
      { workflow: null, target: "Build/$1.md" },
      { workflow: "standard", target: null },
      { workflow: "standard", target: "   " },
    ]) {
      const run = await runProject({
        ...options,
        scenes: [{ name: "A", value: "04/03/2026 09:30" }],
      });
      expect(run.path).toBe("Novels/My Book/manuscript_timeline.md");
    }
  });
});

describe("scale and edge cases", () => {
  it("handles 200 scenes without losing or reordering any", async () => {
    const scenes = Array.from({ length: 200 }, (_, index) => ({
      name: `S${String(index).padStart(3, "0")}`,
      value: `04/03/2026 ${String(Math.floor(index / 60)).padStart(2, "0")}:${String(
        index % 60
      ).padStart(2, "0")}`,
    }));
    const run = await runProject({ scenes });
    expect(run.result.entries).toHaveLength(200);
    expect(run.result.errors).toEqual([]);
    expect(run.result.entries[0].sceneTitle).toBe("S000");
    expect(run.result.entries[199].sceneTitle).toBe("S199");
  });

  it("handles a single scene", async () => {
    const run = await runProject({
      scenes: [{ name: "A", value: "04/03/2026 09:30" }],
    });
    expect(rows(run.contents)).toEqual(["| A | 4/3/2026 9:30 |"]);
    expect(run.contents).not.toContain("## Not on the timeline");
  });

  it("handles an empty scene list", async () => {
    const run = await runProject({ scenes: [] });
    expect(run.output.size).toBe(0);
  });

  it("escapes a pipe in a scene title in the table and keeps it in the data block", async () => {
    const run = await runProject({
      scenes: [{ name: "A | B", value: "04/03/2026 09:30" }],
    });
    const data = dataBlock(run.contents) as {
      scenes: { scene: string }[];
    };
    expect(data.scenes[0].scene).toBe("A | B");
    expect(rows(run.contents)).toEqual(["| A \\| B | 4/3/2026 9:30 |"]);
  });
});
