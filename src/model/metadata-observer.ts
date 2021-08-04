import type { App, MetadataCache, TFile, Vault } from "obsidian";
import type { Unsubscriber } from "svelte/store";
import isEqual from "lodash/isEqual";
import cloneDeep from "lodash/cloneDeep";

import type { IndexFileMetadata } from "./types";
import { pluginSettings, projectMetadata } from "../view/stores";
import { indexFilePath } from "./project";
import { indexBodyFor } from "./index-file";

type ProjectIndexPaths = {
  projectPath: string;
  indexPath: string;
};

/**
 * Observes all known project index files and keeps their frontmatters
 * in sync with the corresponding store.
 *
 * Store updates are written to disk, and file edits are set to the store.
 *
 * When index files have invalid frontmatter, e.g. you're mid-edit, updates
 * are ignored. This class must have `destroy()` called on plugin unload
 * to avoid leaking store subscriptions.
 */
export class IndexMetadataObserver {
  private vault: Vault;
  private cache: MetadataCache;
  private watchedIndexPaths: ProjectIndexPaths[];
  private unsubscribeSettings: Unsubscriber;
  private unsubscribeMetadata: Unsubscriber;
  private ignoreNextMetadataUpdate = true;
  private lastKnownMetadataState: Record<string, IndexFileMetadata> = {};

  constructor(app: App) {
    this.vault = app.vault;
    this.cache = app.metadataCache;

    // Load project/index file paths
    this.unsubscribeSettings = pluginSettings.subscribe((settings) => {
      const indexPaths: ProjectIndexPaths[] = [];
      Object.keys(settings.projects).forEach((projectPath) => {
        const project = settings.projects[projectPath];
        indexPaths.push({
          projectPath,
          indexPath: indexFilePath(project),
        });
      });
      this.watchedIndexPaths = indexPaths;

      // Load existing projects' metadata
      const allMetadata: Record<string, IndexFileMetadata> = {};
      this.watchedIndexPaths.forEach((paths) => {
        const metadata = this.cache.getCache(paths.indexPath)
          .frontmatter as unknown;
        allMetadata[paths.projectPath] = filterMetadata(
          metadata as IndexFileMetadata
        );
      });

      this.lastKnownMetadataState = cloneDeep(allMetadata);
      if (this.unsubscribeMetadata) {
        this.ignoreNextMetadataUpdate = true;
      }
      projectMetadata.set(allMetadata);
    });

    // Pass store metadata changes (ie longform app changes)
    // back to the index file
    this.unsubscribeMetadata = projectMetadata.subscribe((value) => {
      if (!this.ignoreNextMetadataUpdate) {
        this.metadataStoreChanged(value);
      }
      this.ignoreNextMetadataUpdate = false;
      this.lastKnownMetadataState = cloneDeep(value);
    });
  }

  destroy(): void {
    this.unsubscribeSettings();
    this.unsubscribeMetadata();
  }

  metadataCacheChanged(file: TFile): void {
    // Is this a file we're watching?
    const paths = this.watchedIndexPaths.find((p) => p.indexPath === file.path);
    if (paths) {
      const newMetadata = this.cache.getFileCache(file).frontmatter as unknown;
      // Ignore invalid YAML results, file likely mid-edit
      if (!newMetadata) {
        return;
      }
      this.ignoreNextMetadataUpdate = true;
      projectMetadata.update((value) => {
        const v = value;
        v[paths.projectPath] = filterMetadata(newMetadata as IndexFileMetadata);
        this.lastKnownMetadataState = cloneDeep(v);
        return v;
      });
    }
  }

  metadataStoreChanged(value: Record<string, IndexFileMetadata>): void {
    const lastKnownProjectPaths = Object.keys(this.lastKnownMetadataState);
    Object.keys(value).forEach((projectPath) => {
      const isKnownPath = lastKnownProjectPaths.contains(projectPath);
      const paths = this.watchedIndexPaths.find(
        (p) => p.projectPath === projectPath
      );
      const newIndexMetadata = value[projectPath];
      const isNew =
        !isKnownPath ||
        !isEqual(this.lastKnownMetadataState[projectPath], newIndexMetadata);
      if (paths && isNew) {
        const contents = indexBodyFor(newIndexMetadata);
        this.vault.adapter.write(paths.indexPath, contents);
      }
    });
    this.lastKnownMetadataState = cloneDeep(value);
  }
}

function filterMetadata(metadata: IndexFileMetadata): IndexFileMetadata {
  // Ideally TypeScript would do this for me, but that seems to be impossible.
  // Instead, we have to manually strip out anything we know isn't a property of the type.

  return {
    version: metadata.version,
    drafts: metadata.drafts,
  };
}
