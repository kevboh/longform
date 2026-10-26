import { afterEach, describe, expect, it } from "vitest";

import { drafts } from "../src/model/stores";
import { TimeframeObserver } from "../src/model/timeframe-observer";
import {
  flush,
  makeFile,
  makeProject,
  rows,
  type ProjectOptions,
} from "./helpers/project";

const TIMELINE = "Novels/My Book/manuscript_timeline.md";

let observer: TimeframeObserver | null = null;

afterEach(() => {
  observer?.destroy();
  observer = null;
  drafts.set([]);
});

async function start(options: ProjectOptions) {
  const project = makeProject(options);
  drafts.set([project.draft]);
  observer = new TimeframeObserver(project.app);
  observer.beginObserving();
  await flush();
  return project;
}

function sceneFile(project: ReturnType<typeof makeProject>, name: string) {
  const path = `${project.folder}/${project.sceneFolder}/${name}.md`;
  return project.files.get(path)!;
}

function notify(project: ReturnType<typeof makeProject>, name: string) {
  const file = sceneFile(project, name).file;
  observer!.fileMetadataChanged(file, "", {
    frontmatter: sceneFile(project, name).frontmatter,
  } as never);
}

describe("startup", () => {
  it("builds every eligible project on start", async () => {
    const project = await start({
      scenes: [{ name: "A", value: "04/03/2026 09:30" }],
    });
    expect(rows(project.output.get(TIMELINE)!)).toContain(
      "| A | 4/3/2026 9:30 |"
    );
  });

  it("creates no file when nothing has a timeframe", async () => {
    const project = await start({ scenes: [{ name: "A" }, { name: "B" }] });
    expect(project.output.size).toBe(0);
  });

  it("skips container scenes", async () => {
    const project = await start({
      scenes: [
        { name: "Act", indent: 0 },
        { name: "A", value: "04/03/2026 09:30", indent: 1 },
      ],
    });
    expect(rows(project.output.get(TIMELINE)!)).toContain(
      "| A | 4/3/2026 9:30 |"
    );
    expect(rows(project.output.get(TIMELINE)!).join("\n")).not.toContain(
      "| Act |"
    );
  });
});

describe("scene value changes", () => {
  it("rebuilds when a value is added", async () => {
    const project = await start({
      scenes: [
        { name: "A", value: "04/03/2026 09:30" },
        { name: "B" },
      ],
    });
    expect(project.output.get(TIMELINE)).toContain("## Not on the timeline");

    sceneFile(project, "B").frontmatter.timeframe = "06/03/2026 09:30";
    notify(project, "B");
    await flush();

    const contents = project.output.get(TIMELINE)!;
    expect(rows(contents)).toContain("| B | 6/3/2026 9:30 |");
    expect(contents).not.toContain("## Not on the timeline");
  });

  it("rebuilds when a value changes", async () => {
    const project = await start({
      scenes: [{ name: "A", value: "04/03/2026 09:30" }],
    });

    sceneFile(project, "A").frontmatter.timeframe = "07/03/2026 09:30";
    notify(project, "A");
    await flush();

    const contents = project.output.get(TIMELINE)!;
    expect(rows(contents)).toContain("| A | 7/3/2026 9:30 |");
    expect(rows(contents)).not.toContain("| A | 4/3/2026 9:30 |");
  });

  it("rebuilds when a value is removed", async () => {
    const project = await start({
      scenes: [
        { name: "A", value: "04/03/2026 09:30" },
        { name: "B", value: "05/03/2026 09:30" },
      ],
    });

    delete sceneFile(project, "B").frontmatter.timeframe;
    notify(project, "B");
    await flush();

    const contents = project.output.get(TIMELINE)!;
    expect(contents).toContain("## Not on the timeline");
    expect(contents).toContain("- B");
    expect(rows(contents)).not.toContain("| B | 5/3/2026 9:30 |");
  });

  it("ignores changes that are not the timeframe value", async () => {
    const project = await start({
      scenes: [{ name: "A", value: "04/03/2026 09:30" }],
    });
    const before = project.writes.length;

    sceneFile(project, "A").frontmatter.title = "Renamed";
    notify(project, "A");
    await flush();

    expect(project.writes.length).toBe(before);
  });

  it("ignores files outside the project and the index file", async () => {
    const project = await start({
      scenes: [{ name: "A", value: "04/03/2026 09:30" }],
    });
    const before = project.writes.length;

    const note = makeFile("Novels/My Book/Notes/idea.md", "Novels/My Book/Notes");
    observer!.fileMetadataChanged(note, "", {
      frontmatter: { timeframe: "01/01/2020 00:00" },
    } as never);
    await flush();

    const index = project.files.get(project.indexPath)!.file;
    observer!.fileMetadataChanged(index, "", {
      frontmatter: { timeframe: "01/01/2020 00:00" },
    } as never);
    await flush();

    expect(project.writes.length).toBe(before);
  });
});

describe("project signature changes", () => {
  it("rebuilds when the time format changes", async () => {
    const project = await start({
      scenes: [{ name: "A", value: "04/03/2026 09:30" }],
    });
    expect(project.output.get(TIMELINE)).toContain("## Scenes");

    drafts.set([{ ...project.draft, timeFormat: "time" }]);
    await flush();

    expect(project.output.get(TIMELINE)).toContain("## Problems");
  });

  it("rebuilds when the tag changes and values exist under the new tag", async () => {
    const project = await start({
      scenes: [{ name: "A", value: "04/03/2026 09:30" }],
    });

    sceneFile(project, "A").frontmatter.when = "05/03/2026 09:30";
    drafts.set([{ ...project.draft, timeframeTagName: "when" }]);
    await flush();

    const contents = project.output.get(TIMELINE)!;
    expect(contents).toContain("**Timeframe tag:** `when`");
    expect(rows(contents)).toContain("| A | 5/3/2026 9:30 |");
  });

  it("does nothing when the tag changes and no values exist under it", async () => {
    const project = await start({
      scenes: [{ name: "A", value: "04/03/2026 09:30" }],
    });
    const before = project.output.get(TIMELINE);
    const writes = project.writes.length;

    drafts.set([{ ...project.draft, timeframeTagName: "when" }]);
    await flush();

    expect(project.writes.length).toBe(writes);
    expect(project.output.get(TIMELINE)).toBe(before);
  });

  it("rebuilds when a scene is added", async () => {
    const project = await start({
      scenes: [{ name: "A", value: "04/03/2026 09:30" }],
    });

    const path = `${project.folder}/${project.sceneFolder}/C.md`;
    project.files.set(path, {
      file: makeFile(path, `${project.folder}/${project.sceneFolder}`),
      frontmatter: { timeframe: "06/03/2026 09:30" },
    });
    drafts.set([
      {
        ...project.draft,
        scenes: [...project.draft.scenes, { title: "C", indent: 0 }],
      },
    ]);
    await flush();

    expect(rows(project.output.get(TIMELINE)!)).toContain(
      "| C | 6/3/2026 9:30 |"
    );
  });

  it("rebuilds when a scene is removed", async () => {
    const project = await start({
      scenes: [
        { name: "A", value: "04/03/2026 09:30" },
        { name: "B", value: "05/03/2026 09:30" },
      ],
    });

    drafts.set([
      {
        ...project.draft,
        scenes: project.draft.scenes.filter((scene) => scene.title !== "B"),
      },
    ]);
    await flush();

    const contents = project.output.get(TIMELINE)!;
    expect(contents).not.toContain("| B |");
  });
});
