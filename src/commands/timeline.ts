import { get } from "svelte/store";
import { Notice } from "obsidian";

import type { CommandBuilder } from "./types";
import { selectedDraft } from "../model/stores";
import { buildTimeline, writeTimeline } from "../model/timeline";

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

    void (async () => {
      try {
        const result = await buildTimeline(plugin.app, draft);
        await writeTimeline(plugin.app, draft, result);
        new Notice("Timeline rebuilt.");
      } catch (error) {
        console.error(
          "[Longform Extended] Failed to rebuild timeline:",
          error
        );
        new Notice("Could not rebuild timeline. See the console.");
      }
    })();
  },
});
