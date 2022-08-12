import { FuzzySuggestModal, type App, type Instruction } from "obsidian";
import { get } from "svelte/store";
import { repeat } from "lodash";

import type { CommandBuilder } from "./types";
import { activeFile } from "src/view/stores";
import {
  drafts as draftsStore,
  projects as projectsStore,
  selectedDraft,
  selectedDraftVaultPath,
} from "src/model/stores";
import {
  findScene,
  scenePath,
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

export const focusCurrentDraft: CommandBuilder = () => ({
  id: "longform-focus-current-draft",
  name: "Open Current Note’s Project",
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
      const scene = findScene(path, drafts);
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
  items: Map<string, T>;
  onSelect: (value: T, metaKey: boolean) => void;

  constructor(
    app: App,
    items: Map<string, T>,
    instructions: Instruction[] = [],
    onSelect: (value: T, metaKey: boolean) => void
  ) {
    super(app);

    this.items = items;
    this.onSelect = onSelect;

    this.scope.register(["Meta"], "Enter", (evt) => {
      const result = this.containerEl.getElementsByClassName(
        "suggestion-item is-selected"
      );
      if (result.length > 0) {
        const selected = result[0].innerHTML;
        this.onChooseItem(selected, evt);
      }
      this.close();
      return false;
    });

    this.setInstructions(instructions);
  }

  getItems(): string[] {
    return Array.from(this.items.keys());
  }

  getItemText(item: string): string {
    return item;
  }

  onChooseItem(item: string, evt: MouseEvent | KeyboardEvent): void {
    this.onSelect(this.items.get(item), evt.metaKey);
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
          const items = new Map<string, string>();

          [...project].reverse().forEach((d) => {
            items.set(draftTitle(d), d.vaultPath);
          });
          new JumpModal(
            plugin.app,
            items,
            [
              {
                command: "↑↓",
                purpose: "to navigate",
              },
              {
                command: "↵",
                purpose: "to open in Longform",
              },
              {
                command: "esc",
                purpose: "to dismiss",
              },
            ],
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

    const projects: Map<string, Draft[]> = new Map(
      Object.entries(get(projectsStore))
    );

    new JumpModal(
      plugin.app,
      projects,
      [
        {
          command: "↑↓",
          purpose: "to navigate",
        },
        {
          command: "↵",
          purpose: "to open in Longform",
        },
        {
          command: "esc",
          purpose: "to dismiss",
        },
      ],
      projectCallback
    ).open();
  },
});

export const jumpToScene: CommandBuilder = (plugin) => ({
  id: "longform-jump-to-scene",
  name: "Jump to Scene in Current Project",
  checkCallback(checking) {
    const currentDraft = get(selectedDraft);
    if (
      !currentDraft ||
      currentDraft.format === "single" ||
      currentDraft.scenes.length === 0
    ) {
      return false;
    }
    if (checking) {
      return true;
    }

    const scenesToTitles: Map<string, string> = new Map();
    currentDraft.scenes.forEach((s) => {
      scenesToTitles.set(`${repeat("\t", s.indent)}${s.title}`, s.title);
    });

    new JumpModal(
      plugin.app,
      scenesToTitles,
      [
        {
          command: "↑↓",
          purpose: "to navigate",
        },
        {
          command: "↵",
          purpose: "to open",
        },
        {
          command: "cmd ↵",
          purpose: "to open in a new pane",
        },
        {
          command: "esc",
          purpose: "to dismiss",
        },
      ],
      (scene: string, metaKey: boolean) => {
        const path = scenePath(scene, currentDraft, plugin.app.vault);
        if (path) {
          plugin.app.workspace.openLinkText(path, "/", metaKey);
        }
      }
    ).open();
  },
});
