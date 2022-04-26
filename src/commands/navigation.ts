import { FuzzySuggestModal, type App } from "obsidian";
import { get } from "svelte/store";
import { fromPairs, identity, reverse } from "lodash";

import type { CommandBuilder } from "./types";
import { activeFile } from "src/view/stores";
import {
  drafts as draftsStore,
  projects as projectsStore,
  selectedDraftVaultPath,
} from "src/model/stores";
import {
  findScene,
  scenePathForLocation,
  type SceneNavigationLocation,
} from "src/model/scene-navigation";
import { VIEW_TYPE_LONGFORM_EXPLORER } from "src/view/explorer/ExplorerPane";
import type LongformPlugin from "src/main";
import type { Draft } from "src/model/types";
import { draftTitle } from "src/model/draft-utils";

const checkForLocation = (
  checking: boolean,
  location: SceneNavigationLocation,
  app: App
): boolean | void => {
  const path = get(activeFile).path;
  const drafts = get(draftsStore);
  const newPath = scenePathForLocation(location, path, drafts, app.vault);
  if (checking) {
    return newPath !== null;
  }
  app.workspace.openLinkText(newPath, "/", false);
};

export const previousScene: CommandBuilder = (plugin) => ({
  id: "longform-previous-scene",
  name: "Previous Scene",
  editorCheckCallback: (checking: boolean) =>
    checkForLocation(
      checking,
      {
        position: "previous",
        maintainIndent: false,
      },
      plugin.app
    ),
});

export const previousSceneAtIndent: CommandBuilder = (plugin) => ({
  id: "longform-previous-scene-at-level",
  name: "Previous Scene at Indent Level",
  editorCheckCallback: (checking: boolean) =>
    checkForLocation(
      checking,
      {
        position: "previous",
        maintainIndent: true,
      },
      plugin.app
    ),
});

export const nextScene: CommandBuilder = (plugin) => ({
  id: "longform-next-scene",
  name: "Next Scene",
  editorCheckCallback: (checking: boolean) =>
    checkForLocation(
      checking,
      {
        position: "next",
        maintainIndent: false,
      },
      plugin.app
    ),
});

export const nextSceneAtIndent: CommandBuilder = (plugin) => ({
  id: "longform-next-scene-at-level",
  name: "Next Scene at Indent Level",
  editorCheckCallback: (checking: boolean) =>
    checkForLocation(
      checking,
      {
        position: "next",
        maintainIndent: true,
      },
      plugin.app
    ),
});

export const focusCurrentDraft: CommandBuilder = (plugin) => ({
  id: "longform-focus-current-draft",
  name: "Show Current Project in Longform",
  editorCheckCallback(checking) {
    const path = get(activeFile).path;
    const drafts = get(draftsStore);

    // is the current path an index file?
    const index = drafts.findIndex((d) => d.vaultPath === path);
    if (checking && index >= 0) {
      return true;
    } else if (!checking && index >= 0) {
      const draft = drafts[index];
      selectedDraftVaultPath.set(draft.vaultPath);
    } else {
      // is the current path a scene?
      const scene = findScene(path, drafts, plugin.app.vault);
      if (checking && scene) {
        return true;
      } else if (!checking && scene) {
        const draft = scene.draft;
        selectedDraftVaultPath.set(draft.vaultPath);
      }
    }

    return false;
  },
});

const showLeaf = (plugin: LongformPlugin) => {
  plugin.initLeaf();
  const leaf = plugin.app.workspace
    .getLeavesOfType(VIEW_TYPE_LONGFORM_EXPLORER)
    .first();
  if (leaf) {
    plugin.app.workspace.revealLeaf(leaf);
  }
};

export const showLongform: CommandBuilder = (plugin) => ({
  id: "longform-show-view",
  name: "Open Longform Pane",
  callback: () => {
    showLeaf(plugin);
  },
});

class JumpModal<T> extends FuzzySuggestModal<string> {
  items: Record<string, T>;
  sort: (items: string[]) => string[];
  onSelect: (value: T) => void;

  constructor(
    app: App,
    items: Record<string, T>,
    sort: (items: string[]) => string[],
    onSelect: (value: T) => void
  ) {
    super(app);

    this.items = items;
    this.sort = sort;
    this.onSelect = onSelect;
  }

  getItems(): string[] {
    return this.sort(Object.keys(this.items));
  }

  getItemText(item: string): string {
    return item;
  }

  onChooseItem(item: string, _evt: MouseEvent | KeyboardEvent): void {
    this.onSelect(this.items[item]);
  }
}

export const jumpToProject: CommandBuilder = (plugin) => ({
  id: "longform-jump-to-project",
  name: "Jump to Project",
  callback: () => {
    const projectCallback = (project: Draft[]) => {
      if (project && project.length > 0) {
        if (project.length === 1) {
          const draft = project[0];
          selectedDraftVaultPath.set(draft.vaultPath);
          showLeaf(plugin);
          plugin.app.workspace.openLinkText(draft.vaultPath, "/", false);
        } else {
          const items = fromPairs(
            project.map((d) => [draftTitle(d), d.vaultPath])
          );
          new JumpModal(
            plugin.app,
            items,
            (items) => reverse(items),
            (vaultPath) => {
              const draft = project.find((d) => d.vaultPath === vaultPath);
              if (draft) {
                selectedDraftVaultPath.set(draft.vaultPath);
                showLeaf(plugin);
              }
            }
          ).open();
        }
      }
    };
    new JumpModal(
      plugin.app,
      get(projectsStore),
      identity,
      projectCallback
    ).open();
  },
});
