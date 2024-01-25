import type { App, PaneType } from "obsidian";

import { get } from "svelte/store";
import { repeat } from "lodash";

import type { CommandBuilder } from "./types";
import { activeFile, selectedTab } from "src/view/stores";
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
import { JumpModal } from "./helpers";

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
  name: "Previous scene",
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
  name: "Previous scene at indent level",
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
  name: "Next scene",
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
  name: "Next scene at indent level",
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
  name: "Open current note’s project",
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
  name: "Open Longform pane",
  callback: () => {
    showLeaf(plugin);
  },
});

export const jumpToProject: CommandBuilder = (plugin) => ({
  id: "longform-jump-to-project",
  name: "Jump to project",
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
  name: "Jump to scene in current project",
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
      (scene: string, modEvent: boolean | PaneType) => {
        const path = scenePath(scene, currentDraft, plugin.app.vault);
        if (path) {
          plugin.app.workspace.openLinkText(path, "/", modEvent);
        }
      }
    ).open();
  },
});

export const revealProjectFolder: CommandBuilder = (plugin) => ({
  id: "longform-reveal-project-folder",
  name: "Reveal current project in navigation",
  checkCallback(checking) {
    const path = get(selectedDraftVaultPath);
    if (checking) {
      return path !== null;
    }

    if (!path) {
      return;
    }

    // NOTE: This is private Obsidian API, and may fail or change at any time.
    try {
      const parent = plugin.app.vault.getAbstractFileByPath(path).parent;
      (plugin.app as any).internalPlugins.plugins[
        "file-explorer"
      ].instance.revealInFolder(parent);
    } catch (error) {
      console.error(
        "[Longform] Error calling file-explorer.revealInFolder:",
        error
      );
    }
  },
});

export const focusNewSceneField: CommandBuilder = (plugin) => ({
  id: "longform-focus-new-scene-field",
  name: "Focus new scene field",
  checkCallback(checking) {
    const draft = get(selectedDraft);
    if (checking) {
      return draft && draft.format === "scenes";
    }
    if (!draft || draft.format !== "scenes") {
      return;
    }

    showLeaf(plugin);
    selectedTab.set("Scenes");
    setTimeout(() => {
      activeDocument.getElementById("new-scene").focus();
    }, 0);
  },
});
