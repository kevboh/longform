import { afterEach, describe, expect, it } from "vitest";

import { rebuildTimeline } from "../src/commands/timeline";
import { drafts, selectedDraftVaultPath } from "../src/model/stores";
import type { SingleSceneDraft } from "../src/model/types";
import { flush, makeProject } from "./helpers/project";

const TIMELINE = "Novels/My Book/manuscript_timeline.md";

afterEach(() => {
  drafts.set([]);
  selectedDraftVaultPath.set(null);
});

function commandFor(app: unknown) {
  return rebuildTimeline({ app } as never);
}

function singleDraft(): SingleSceneDraft {
  return {
    format: "single",
    title: "Single",
    titleInFrontmatter: true,
    draftTitle: null,
    vaultPath: "Novels/Single.md",
    workflow: null,
  };
}

describe("Rebuild timeline command", () => {
  it("is available only for multi-scene projects", () => {
    const project = makeProject({
      scenes: [{ name: "A", value: "04/03/2026 09:30" }],
    });
    drafts.set([project.draft]);
    selectedDraftVaultPath.set(project.draft.vaultPath);

    expect(
      commandFor(project.app).checkCallback!(true)
    ).toBe(true);
  });

  it("is unavailable for a single-scene project", () => {
    const single = singleDraft();
    drafts.set([single]);
    selectedDraftVaultPath.set(single.vaultPath);

    expect(
      commandFor({}).checkCallback!(true)
    ).toBe(false);
  });

  it("is unavailable with no selected project", () => {
    drafts.set([]);
    selectedDraftVaultPath.set(null);

    expect(
      commandFor({}).checkCallback!(true)
    ).toBe(false);
  });

  it("rebuilds the selected project", async () => {
    const project = makeProject({
      scenes: [{ name: "A", value: "04/03/2026 09:30" }],
    });
    drafts.set([project.draft]);
    selectedDraftVaultPath.set(project.draft.vaultPath);

    commandFor(project.app).checkCallback!(false);
    await flush();

    expect(project.output.get(TIMELINE)).toContain("| A | 4/3/2026 9:30 |");
  });

  it("does not create a file when there is nothing to show", async () => {
    const project = makeProject({ scenes: [{ name: "A" }] });
    drafts.set([project.draft]);
    selectedDraftVaultPath.set(project.draft.vaultPath);

    commandFor(project.app).checkCallback!(false);
    await flush();

    expect(project.output.size).toBe(0);
  });
});
