import { normalizePath, type Vault } from "obsidian";
import type { Draft, MultipleSceneDraft } from "./types";

export function projectFolderPath(draft: Draft, vault: Vault): string {
  return vault.getAbstractFileByPath(draft.vaultPath).parent.path;
}

export function sceneFolderPath(
  draft: MultipleSceneDraft,
  vault: Vault
): string {
  const root = vault.getAbstractFileByPath(draft.vaultPath).parent.path;
  return normalizePath(`${root}/${draft.sceneFolder}`);
}

export function scenePathForFolder(
  sceneName: string,
  folderPath: string
): string {
  return normalizePath(`${folderPath}/${sceneName}.md`);
}

export function scenePath(
  sceneName: string,
  draft: MultipleSceneDraft,
  vault: Vault
): string {
  const sceneFolder = sceneFolderPath(draft, vault);
  return scenePathForFolder(sceneName, sceneFolder);
}

export function findScene(
  path: string,
  drafts: Draft[],
  vault: Vault
): { draft: Draft; index: number; currentIndent: number } | null {
  for (const draft of drafts) {
    if (draft.format === "scenes") {
      const file = vault.getAbstractFileByPath(draft.vaultPath);
      if (!file) {
        continue;
      }
      const root = file.parent.path;
      const index = draft.scenes.findIndex(
        (s) =>
          normalizePath(`${root}/${draft.sceneFolder}/${s.title}.md`) === path
      );
      if (index >= 0) {
        return { draft, index, currentIndent: draft.scenes[index].indent };
      }
    }
  }
  return null;
}

export function draftForPath(
  path: string,
  drafts: Draft[],
  vault: Vault
): Draft | null {
  for (const draft of drafts) {
    if (draft.vaultPath === path) {
      return draft;
    } else {
      const found = findScene(path, drafts, vault);
      if (found) {
        return found.draft;
      }
    }
  }
  return null;
}

export type SceneNavigationLocation = {
  position: "next" | "previous";
  maintainIndent: boolean;
};

export function scenePathForLocation(
  location: SceneNavigationLocation,
  path: string,
  drafts: Draft[],
  vault: Vault
): string | null {
  for (const draft of drafts) {
    if (draft.format === "scenes") {
      const root = vault.getAbstractFileByPath(draft.vaultPath).parent.path;
      const index = draft.scenes.findIndex(
        (s) =>
          normalizePath(`${root}/${draft.sceneFolder}/${s.title}.md`) === path
      );
      if (index >= 0) {
        if (location.position === "next" && index < draft.scenes.length - 1) {
          if (!location.maintainIndent) {
            const nextScene = draft.scenes[index + 1];
            return normalizePath(
              `${root}/${draft.sceneFolder}/${nextScene.title}.md`
            );
          } else {
            const indent = draft.scenes[index].indent;
            const nextSceneAtIndent = draft.scenes
              .slice(index + 1)
              .find((s) => s.indent === indent);
            if (nextSceneAtIndent) {
              return normalizePath(
                `${root}/${draft.sceneFolder}/${nextSceneAtIndent.title}.md`
              );
            }
          }
        } else if (location.position === "previous" && index > 0) {
          if (!location.maintainIndent) {
            const previousScene = draft.scenes[index - 1];
            return normalizePath(
              `${root}/${draft.sceneFolder}/${previousScene.title}.md`
            );
          } else {
            const indent = draft.scenes[index].indent;
            const previousSceneAtIndent = draft.scenes
              .slice(0, index)
              .find((s) => s.indent === indent);
            if (previousSceneAtIndent) {
              return normalizePath(
                `${root}/${draft.sceneFolder}/${previousSceneAtIndent.title}.md`
              );
            }
          }
        }
      }
    }
  }
  return null;
}
