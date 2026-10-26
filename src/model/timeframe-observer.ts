import { type App, type CachedMetadata, TFile } from "obsidian";
import { get, type Unsubscriber } from "svelte/store";

import type { MultipleSceneDraft } from "./types";
import { draftForPath, scenePath } from "./scene-navigation";
import { drafts as draftsStore } from "./stores";
import { buildTimeline, writeTimeline } from "./timeline";

/** Rebuilds timelines when scene values or project structure change. */
export class TimeframeObserver {
  private app: App;
  private values = new Map<string, unknown>();
  private signatures = new Map<string, string>();
  private unsubscribeDrafts: Unsubscriber | null = null;
  private rebuilding = new Set<string>();

  constructor(app: App) {
    this.app = app;
  }

  beginObserving(): void {
    this.sync(false);
    this.unsubscribeDrafts = draftsStore.subscribe(() => this.sync(true));
    this.rebuildAll();
  }

  destroy(): void {
    if (this.unsubscribeDrafts) {
      this.unsubscribeDrafts();
    }
  }

  fileMetadataChanged(file: TFile, _data: string, cache: CachedMetadata): void {
    const draft = draftForPath(file.path, get(draftsStore));
    if (!draft || draft.format !== "scenes" || file.path === draft.vaultPath) {
      return;
    }

    const value = cache?.frontmatter?.[draft.timeframeTagName];
    const known = this.values.has(file.path);
    const previous = this.values.get(file.path);
    this.values.set(file.path, value);

    if (known && previous !== value) {
      this.rebuildTimeline(draft);
    }
  }

  private async rebuildTimeline(draft: MultipleSceneDraft): Promise<void> {
    if (this.rebuilding.has(draft.vaultPath)) {
      return;
    }
    this.rebuilding.add(draft.vaultPath);

    try {
      const result = await buildTimeline(this.app, draft);
      await writeTimeline(this.app, draft, result);
    } catch (error) {
      console.error("[Longform Extended] Failed to rebuild timeline:", error);
    } finally {
      this.rebuilding.delete(draft.vaultPath);
    }
  }

  private rebuildAll(): void {
    for (const draft of get(draftsStore)) {
      if (draft.format === "scenes") {
        this.rebuildTimeline(draft);
      }
    }
  }

  /** Records current values and signatures, rebuilding changed projects. */
  private sync(rebuildChanged: boolean): void {
    const drafts = get(draftsStore);
    const scenePaths = new Set<string>();
    const draftPaths = new Set<string>();

    for (const draft of drafts) {
      if (draft.format !== "scenes") {
        continue;
      }
      draftPaths.add(draft.vaultPath);

      const signature = [
        draft.title,
        draft.workflow ?? "",
        draft.sceneFolder,
        draft.timeFormat,
        draft.timeframeTagName,
        draft.scenes.map((scene) => scene.title).join("\u0000"),
      ].join("\u0001");
      const previous = this.signatures.get(draft.vaultPath);
      this.signatures.set(draft.vaultPath, signature);

      if (rebuildChanged && previous !== undefined && previous !== signature) {
        this.rebuildTimeline(draft);
      }

      for (const scene of draft.scenes) {
        const file = this.app.vault.getAbstractFileByPath(
          scenePath(scene.title, draft, this.app.vault)
        );
        if (!(file instanceof TFile)) {
          continue;
        }
        scenePaths.add(file.path);
        if (!this.values.has(file.path)) {
          this.values.set(
            file.path,
            this.app.metadataCache.getFileCache(file)?.frontmatter?.[
              draft.timeframeTagName
            ]
          );
        }
      }
    }

    prune(this.values, scenePaths);
    prune(this.signatures, draftPaths);
  }
}

function prune<T>(map: Map<string, T>, keep: Set<string>): void {
  for (const key of Array.from(map.keys())) {
    if (!keep.has(key)) {
      map.delete(key);
    }
  }
}
