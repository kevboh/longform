import { get } from "svelte/store";
import { Notice, type App } from "obsidian";

import type { CommandBuilder } from "./types";
import { selectedDraft } from "src/model/stores";
import { buildTimeline, writeTimeline } from "src/model/timeline";
import type { MultipleSceneDraft } from "src/model/types";

export const rebuildTimeline: CommandBuilder = (plugin) => ({
  id: "longform-extended-rebuild-timeline",
  name: "Rebuild timeline",
  checkCallback(checking: boolean) {
    const draft = get(selectedDraft);
    if (checking) {
      return !!draft && draft.format === "scenes";
    }
    if (!draft || draft.format !== "scenes") {
      return;
    }

    void rebuild(plugin.app, draft);
  },
});

async function rebuild(app: App, draft: MultipleSceneDraft): Promise<void> {
  try {
    const result = await buildTimeline(app, draft);
    await writeTimeline(app, draft, result);
    new Notice("Timeline rebuilt.");
  } catch (error) {
    console.error("[Longform Extended] Failed to rebuild timeline:", error);
    new Notice("Could not rebuild timeline. See the console.");
  }
}
