import { type App, type CachedMetadata, normalizePath, TFile } from "obsidian";
import { get, type Unsubscriber } from "svelte/store";

import type { MultipleSceneDraft } from "./types";
import { draftForPath, projectFolderPath, scenePath } from "./scene-navigation";
import { drafts as draftsStore, timeframeRevision } from "./stores";

/**
 * Watches scene files for changes to their timeframe tag value.
 *
 * Scope is limited to notes inside `scenes`-format Longform projects. When a
 * file changes, the observer compares the previous value of that draft's
 * `timeframeTagName` property to the new one. If the tag was added, removed,
 * or had its value changed, it bumps `timeframeRevision` so the timeline view
 * knows to re-render. If the timeframe tag did not change, it does nothing.
 */
export class TimeframeObserver {
  private app: App;
  private lastValueByPath: Map<string, unknown> = new Map();
  private unsubscribeDrafts: Unsubscriber | null = null;

  constructor(app: App) {
    this.app = app;
  }

  beginObserving(): void {
    this.baseline();
    this.unsubscribeDrafts = draftsStore.subscribe(() => {
      this.baseline();
    });
  }

  destroy(): void {
    if (this.unsubscribeDrafts) {
      this.unsubscribeDrafts();
    }
  }

  fileMetadataChanged(file: TFile, _data: string, cache: CachedMetadata): void {
    const draft = draftForPath(file.path, get(draftsStore));
    if (!draft || draft.format !== "scenes") {
      return;
    }
    if (file.path === draft.vaultPath) {
      return;
    }

    const newValue = cache?.frontmatter?.[draft.timeframeTagName];
    const seen = this.lastValueByPath.has(file.path);
    const oldValue = this.lastValueByPath.get(file.path);
    this.lastValueByPath.set(file.path, newValue);

    if (seen && oldValue !== newValue) {
      timeframeRevision.update((r) => r + 1);
      // TODO: replace with real timeline rendering.
      this.createEmptyTimelineFile(draft);
    }
  }

  /**
   * Temporary placeholder: writes an empty timeline note next to the project
   * index file. This will be replaced by the real timeline view later.
   */
  private async createEmptyTimelineFile(
    draft: MultipleSceneDraft
  ): Promise<void> {
    try {
      const timelinePath = normalizePath(
        `${projectFolderPath(draft, this.app.vault)}/timeline.md`
      );
      if (await this.app.vault.adapter.exists(timelinePath)) {
        return;
      }
      await this.app.vault.create(timelinePath, "");
    } catch (error) {
      console.error("[Longform] Failed to create empty timeline file:", error);
    }
  }

  /**
   * Seeds the observer with the current timeframe value of every scene so
   * that only later changes are treated as changes. New scenes are seeded,
   * and scenes that have left a project are pruned.
   */
  private baseline(): void {
    const activePaths = new Set<string>();

    for (const draft of get(draftsStore)) {
      if (draft.format !== "scenes") {
        continue;
      }
      for (const scene of draft.scenes) {
        const path = scenePath(scene.title, draft, this.app.vault);
        const file = this.app.vault.getAbstractFileByPath(path);
        if (file instanceof TFile) {
          activePaths.add(file.path);
          if (!this.lastValueByPath.has(file.path)) {
            const cache = this.app.metadataCache.getFileCache(file);
            this.lastValueByPath.set(
              file.path,
              cache?.frontmatter?.[draft.timeframeTagName]
            );
          }
        }
      }
    }

    for (const path of Array.from(this.lastValueByPath.keys())) {
      if (!activePaths.has(path)) {
        this.lastValueByPath.delete(path);
      }
    }
  }
}
