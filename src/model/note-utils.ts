import { last, sum } from "lodash";
import type { TFile } from "obsidian";

import type { Draft, DraftWordCounts } from "./types";

export const FRONTMATTER_REGEX = /^---\n(?<yaml>(?:.*?\n)*?)---/m;

export function stripFrontmatter(contents: string): string {
  return contents.replace(FRONTMATTER_REGEX, "");
}

export function replaceFrontmatter(
  contents: string,
  newFrontmatter: string
): string {
  return contents.replace(FRONTMATTER_REGEX, newFrontmatter);
}

export function fileNameFromPath(path: string): string {
  return last(path.split("/")).split(".md")[0];
}

export type SceneWordStats = {
  scene: number;
  draft: number;
  project: number;
};

export function statsForScene(
  activeFile: TFile | null,
  draft: Draft,
  drafts: Draft[],
  counts: DraftWordCounts
): SceneWordStats | null {
  const count = counts[draft.vaultPath];
  if (!count) {
    return null;
  }

  const totalForDraft = (
    vaultPath: string,
    counts: DraftWordCounts
  ): number => {
    const count = counts[vaultPath];
    if (typeof count === "number") {
      return count;
    } else if (typeof count === "object") {
      return sum(Object.values(count));
    } else {
      return 0;
    }
  };

  const totalForProject = (
    title: string,
    drafts: Draft[],
    counts: DraftWordCounts
  ): number => {
    const draftsForProject = drafts.filter((d) => d.title === title);
    return sum(draftsForProject.map((d) => totalForDraft(d.vaultPath, counts)));
  };

  const draftTotal = totalForDraft(draft.vaultPath, counts);
  const projectTotal = totalForProject(draft.title, drafts, counts);

  if (draft.format === "single") {
    return {
      scene: draftTotal,
      draft: draftTotal,
      project: totalForProject(draft.title, drafts, counts),
    };
  } else {
    const sceneName = activeFile ? fileNameFromPath(activeFile.path) : null;
    const sceneTotal =
      sceneName && typeof count !== "number" ? count[sceneName] : 0;
    return {
      scene: sceneTotal,
      draft: draftTotal,
      project: projectTotal,
    };
  }
}
