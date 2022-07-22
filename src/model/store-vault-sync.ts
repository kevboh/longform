import {
  normalizePath,
  parseYaml,
  stringifyYaml,
  type App,
  type CachedMetadata,
  type MetadataCache,
  type TFile,
  type Vault,
} from "obsidian";
import { cloneDeep, isEqual, omit } from "lodash";
import { get, type Unsubscriber } from "svelte/store";

import type { Draft } from "./types";
import { drafts as draftsStore, selectedDraftVaultPath } from "./stores";
import { arraysToIndentedScenes, draftToYAML } from "src/model/draft-utils";
import { fileNameFromPath, replaceFrontmatter } from "./note-utils";
import { findScene } from "./scene-navigation";

type FileWithMetadata = {
  file: TFile;
  metadata: CachedMetadata;
};

/**
 * Observes any file with a `longform` metadata entry and keeps its
 * metadata and associated scenes (if any) updated in the `drafts`
 * store.
 *
 * Subscribes to the `drafts` store and records changes in it to disk.
 *
 * Thus, keeps both store and vault in sync.
 */
export class StoreVaultSync {
  private vault: Vault;
  private metadataCache: MetadataCache;

  private lastKnownDraftsByPath: Record<string, Draft> = {};
  private unsubscribeDraftsStore: Unsubscriber;

  private pathsToIgnoreNextChange: Set<string> = new Set();

  constructor(app: App) {
    this.vault = app.vault;
    this.metadataCache = app.metadataCache;
  }

  destroy(): void {
    this.unsubscribeDraftsStore();
  }

  async discoverDrafts() {
    const start = new Date().getTime();

    const files = this.vault.getMarkdownFiles();
    const resolvedFiles = await Promise.all(
      files.map((f) => this.resolveIfLongformFile(f))
    );
    const draftFiles = resolvedFiles.filter((f) => f !== null);

    const possibleDrafts = await Promise.all(
      draftFiles.map((f) => this.draftFor(f))
    );
    const drafts = possibleDrafts.filter((d) => d !== null);

    // Write dirty drafts back to their index files
    const dirtyDrafts = drafts.filter((d) => d.dirty);
    for (const d of dirtyDrafts) {
      await this.writeDraftFrontmatter(d.draft);
    }

    // Write discovered drafts to draft store
    const draftsToWrite = drafts.map((d) => d.draft);

    this.lastKnownDraftsByPath = cloneDeep(
      draftsToWrite.reduce((acc: Record<string, Draft>, d) => {
        acc[d.vaultPath] = d;
        return acc;
      }, {})
    );
    draftsStore.set(draftsToWrite);

    const message = `[Longform] Loaded and watching projects. Found ${
      draftFiles.length
    } drafts in ${(new Date().getTime() - start) / 1000.0}s.`;

    console.log(message);

    this.unsubscribeDraftsStore = draftsStore.subscribe(
      this.draftsStoreChanged.bind(this)
    );
  }

  async fileMetadataChanged(file: TFile, _data: string, cache: CachedMetadata) {
    if (this.pathsToIgnoreNextChange.delete(file.path)) {
      console.debug(
        `ignored ${file.path} metadata change, anticipated from store`
      );
      return;
    }

    const result = await this.draftFor({ file, metadata: cache });
    if (!result) {
      console.debug(`no valid draft at ${file.path}, ignoring`);
      return;
    }

    const { draft } = result;

    const old = this.lastKnownDraftsByPath[draft.vaultPath];
    if (!old || !isEqual(draft, old)) {
      this.lastKnownDraftsByPath[draft.vaultPath] = draft;
      draftsStore.update((drafts) => {
        const indexOfDraft = drafts.findIndex(
          (d) => d.vaultPath === draft.vaultPath
        );
        if (indexOfDraft < 0) {
          //new draft
          drafts.push(draft);
        } else {
          drafts[indexOfDraft] = draft;
        }
        return drafts;
      });
    }
  }

  async fileDeleted(file: TFile) {
    const drafts = get(draftsStore);
    const draftIndex = drafts.findIndex((d) => d.vaultPath === file.path);
    if (draftIndex >= 0) {
      // index file deletion = delete draft from store
      const newDrafts = cloneDeep(drafts);
      newDrafts.splice(draftIndex, 1);
      draftsStore.set(newDrafts);
      if (get(selectedDraftVaultPath) === file.path) {
        if (newDrafts.length > 0) {
          selectedDraftVaultPath.set(newDrafts[0].vaultPath);
        } else {
          selectedDraftVaultPath.set(null);
        }
      }
    } else {
      // scene deletion = remove scene from draft
      const found = findScene(file.path, drafts);
      if (found) {
        draftsStore.update((_drafts) => {
          return _drafts.map((d) => {
            if (
              d.vaultPath === found.draft.vaultPath &&
              d.format === "scenes"
            ) {
              d.scenes.splice(found.index, 1);
            }
            return d;
          });
        });
      } else {
        // check unknown files, delete from there if present
        const inDraftUnknown = drafts.find(
          (d) => d.format === "scenes" && d.unknownFiles.contains(file.basename)
        );
        if (inDraftUnknown) {
          draftsStore.update((allDrafts) => {
            return allDrafts.map((d) => {
              if (
                d.vaultPath === inDraftUnknown.vaultPath &&
                d.format === "scenes"
              ) {
                d.unknownFiles = d.unknownFiles.filter(
                  (f) => f !== file.basename
                );
              }
              return d;
            });
          });
        }
      }
    }
  }

  async fileRenamed(file: TFile, oldPath: string) {
    const drafts = get(draftsStore);
    const draftIndex = drafts.findIndex((d) => d.vaultPath === oldPath);
    if (draftIndex >= 0) {
      // index file renamed
      draftsStore.update((_drafts) => {
        const d = _drafts[draftIndex];
        d.vaultPath = file.path;
        if (!d.titleInFrontmatter) {
          d.title = fileNameFromPath(file.path);
        }
        _drafts[draftIndex] = d;
        return _drafts;
      });
      if (get(selectedDraftVaultPath) === oldPath) {
        selectedDraftVaultPath.set(file.path);
      }
    } else {
      // scene renamed
      const newTitle = fileNameFromPath(file.path);
      const found = findScene(oldPath, drafts);
      if (found) {
        draftsStore.update((_drafts) => {
          return _drafts.map((d) => {
            if (
              d.vaultPath === found.draft.vaultPath &&
              d.format === "scenes"
            ) {
              d.scenes[found.index].title = newTitle;
            }
            return d;
          });
        });
      } else {
        // check if a new scene has been moved into this folder
        const scenePath = file.parent.path;
        const memberOfDraft = drafts.find((d) => {
          if (d.format !== "scenes") {
            return false;
          }
          const parentPath = this.vault.getAbstractFileByPath(d.vaultPath)
            .parent.path;
          const targetPath = normalizePath(`${parentPath}/${d.sceneFolder}`);
          return targetPath === scenePath;
        });
        if (memberOfDraft) {
          draftsStore.update((allDrafts) => {
            return allDrafts.map((d) => {
              if (
                d.vaultPath === memberOfDraft.vaultPath &&
                d.format === "scenes"
              ) {
                d.unknownFiles.push(newTitle);
              }
              return d;
            });
          });
        }
      }
    }
  }

  async draftsStoreChanged(newValue: Draft[]) {
    for (const draft of newValue) {
      const old = this.lastKnownDraftsByPath[draft.vaultPath];
      if (!old || !isEqual(draft, old)) {
        this.pathsToIgnoreNextChange.add(draft.vaultPath);
        await this.writeDraftFrontmatter(draft);
      }
    }

    this.lastKnownDraftsByPath = cloneDeep(
      newValue.reduce((acc: Record<string, Draft>, d) => {
        acc[d.vaultPath] = d;
        return acc;
      }, {})
    );
  }

  private async resolveIfLongformFile(
    file: TFile
  ): Promise<FileWithMetadata | null> {
    const metadata = this.metadataCache.getFileCache(file);
    if (metadata.frontmatter && metadata.frontmatter["longform"]) {
      return { file, metadata };
    }
    return null;
  }

  // if dirty, draft is modified from reality of index file
  // and should be written back to index file
  private async draftFor(
    fileWithMetadata: FileWithMetadata
  ): Promise<{ draft: Draft; dirty: boolean } | null> {
    if (!fileWithMetadata.metadata.frontmatter) {
      console.log(`no frontmatter at ${fileWithMetadata.file.path}`);
      return null;
    }
    const longformEntry = fileWithMetadata.metadata.frontmatter["longform"];
    if (!longformEntry) {
      console.log(
        `no longform frontmatter entry at ${fileWithMetadata.file.path}`
      );
      return null;
    }
    const format = longformEntry["format"];
    const vaultPath = fileWithMetadata.file.path;
    let title = longformEntry["title"];
    let titleInFrontmatter = true;
    if (!title) {
      titleInFrontmatter = false;
      title = fileNameFromPath(vaultPath);
    }
    const workflow = longformEntry["workflow"] ?? null;
    const draftTitle = longformEntry["draftTitle"] ?? null;

    if (format === "scenes") {
      let rawScenes: any = longformEntry["scenes"] ?? [];

      if (rawScenes.length === 0) {
        // fallback for issue where the metadata cache seems to fail to recognize yaml arrays.
        // in this case, it reports the array as empty when it's not,
        // so we will parse out the yaml directly from the file contents, just in case.
        // discord discussion: https://discord.com/channels/686053708261228577/840286264964022302/994589562082951219

        const contents = await this.vault.adapter.read(
          fileWithMetadata.file.path
        );
        const regex = /^---\n(?<yaml>(?:.*?\n)*)---/m;
        const result = contents.match(regex);
        if (result.groups && result.groups["yaml"]) {
          const yaml = result.groups["yaml"];
          const parsed = parseYaml(yaml);
          rawScenes = parsed["longform"]["scenes"];
        }
      }

      // Convert to indented scenes
      const scenes = arraysToIndentedScenes(rawScenes);
      const sceneFolder = longformEntry["sceneFolder"] ?? "/";
      const ignoredFiles: string[] = longformEntry["ignoredFiles"] ?? [];
      const normalizedSceneFolder = normalizePath(
        `${fileWithMetadata.file.parent.path}/${sceneFolder}`
      );

      const filenamesInSceneFolder = (
        await this.vault.adapter.list(normalizedSceneFolder)
      ).files
        .filter((f) => f !== fileWithMetadata.file.path && f.endsWith(".md"))
        .map((f) => this.vault.getAbstractFileByPath(f).name.slice(0, -3));

      // Filter removed scenes
      const knownScenes = scenes.filter(({ title }) =>
        filenamesInSceneFolder.contains(title)
      );

      const dirty = knownScenes.length !== scenes.length;

      const sceneTitles = new Set(scenes.map((s) => s.title));
      const newScenes = filenamesInSceneFolder.filter(
        (s) => !sceneTitles.has(s)
      );

      // ignore all new scenes that are known-to-ignore per ignoredFiles
      const ignoredRegexes = ignoredFiles.map((p) => ignoredPatternToRegex(p));
      const unknownFiles = newScenes.filter(
        (s) => ignoredRegexes.find((r) => r.test(s)) === undefined
      );

      return {
        draft: {
          format: "scenes",
          title,
          titleInFrontmatter,
          draftTitle,
          vaultPath,
          sceneFolder,
          scenes: knownScenes,
          ignoredFiles,
          unknownFiles,
          workflow,
        },
        dirty,
      };
    } else if (format === "single") {
      return {
        draft: {
          format: "single",
          title,
          titleInFrontmatter,
          draftTitle,
          vaultPath,
          workflow,
        },
        dirty: false,
      };
    } else {
      console.log(
        `[Longform] Error loading draft at ${fileWithMetadata.file.path}: invalid longform.format. Ignoring.`
      );
      return null;
    }
  }

  private async writeDraftFrontmatter(draft: Draft) {
    // Get index file frontmatter
    const fm = omit(this.metadataCache.getCache(draft.vaultPath).frontmatter, [
      "position",
      "longform",
    ]);
    const formatted =
      Object.keys(fm).length > 0 ? `${stringifyYaml(fm).trim()}\n` : "";

    const newFm = `---\n${draftToYAML(draft)}\n${formatted}---\n\n`;

    const contents = await this.vault.adapter.read(draft.vaultPath);
    const newContents = replaceFrontmatter(contents, newFm);
    await this.vault.adapter.write(draft.vaultPath, newContents);
  }
}

const ESCAPED_CHARACTERS = new Set("/&$^+.()=!|[]{},".split(""));
function ignoredPatternToRegex(pattern: string): RegExp {
  let regex = "";

  for (let index = 0; index < pattern.length; index++) {
    const c = pattern[index];

    if (ESCAPED_CHARACTERS.has(c)) {
      regex += "\\" + c;
    } else if (c === "*") {
      regex += ".*";
    } else if (c === "?") {
      regex += ".";
    } else {
      regex += c;
    }
  }

  return new RegExp(`^${regex}$`);
}
