import type { App } from "obsidian";
import { get } from "svelte/store";

import { activeFile } from "src/view/stores";
import { drafts as draftsStore } from "src/model/stores";
import { findScene } from "src/model/scene-navigation";
import type { CommandBuilder } from "./types";

const checkIndent = (
  checking: boolean,
  action: "indent" | "unindent",
  app: App
): boolean | void => {
  const path = get(activeFile).path;
  const drafts = get(draftsStore);
  const result = findScene(path, drafts, app.vault);
  if (checking && result) {
    return action === "indent" || result.currentIndent > 0;
  }

  if (result) {
    draftsStore.update((_drafts) => {
      return _drafts.map((d) => {
        if (d.vaultPath !== result.draft.vaultPath || d.format !== "scenes") {
          return d;
        }

        const delta = action === "indent" ? 1 : -1;

        d.scenes[result.index].indent = d.scenes[result.index].indent + delta;
        return d;
      });
    });
  }
};

export const indentScene: CommandBuilder = (plugin) => ({
  id: "longform-indent-scene",
  name: "Indent Scene",
  editorCheckCallback: (checking: boolean) =>
    checkIndent(checking, "indent", plugin.app),
});

export const unindentScene: CommandBuilder = (plugin) => ({
  id: "longform-unindent-scene",
  name: "Unindent Scene",
  editorCheckCallback: (checking: boolean) =>
    checkIndent(checking, "unindent", plugin.app),
});
