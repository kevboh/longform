import cloneDeep from "lodash/cloneDeep";
import {
  TAbstractFile,
  App,
  normalizePath,
  TFile,
  TFolder,
  Vault,
} from "obsidian";
import { get, Unsubscriber } from "svelte/store";

import {
  pluginSettings,
  projectMetadata,
  currentProjectPath,
  currentDraftPath,
} from "../view/stores";
import { buildDraftsLookup } from "./index-file";

enum DraftsMembership {
  Draft,
  Scene,
  None,
}

interface ProjectFolderContents {
  [projectPath: string]: {
    [draftName: string]: string[];
  };
}

function membership(
  abstractFile: TAbstractFile,
  draftsPath: string
): DraftsMembership {
  if (
    abstractFile instanceof TFolder &&
    abstractFile.parent &&
    abstractFile.parent.path === draftsPath
  ) {
    return DraftsMembership.Draft;
  } else if (
    abstractFile instanceof TFile &&
    abstractFile.parent &&
    abstractFile.parent.parent &&
    abstractFile.parent.parent.path === draftsPath
  ) {
    return DraftsMembership.Scene;
  }
  return DraftsMembership.None;
}

export class FolderObserver {
  private vault: Vault;
  private watchedDraftFolders: {
    draftsPath: string;
    projectPath: string;
  }[];
  private unsubscribeSettings: Unsubscriber;

  constructor(app: App) {
    this.vault = app.vault;

    // Load project paths
    this.unsubscribeSettings = pluginSettings.subscribe((settings) => {
      this.watchedDraftFolders = Object.keys(settings.projects).map(
        (projectPath) => ({
          draftsPath: normalizePath(
            `${projectPath}/${settings.projects[projectPath].draftsPath}`
          ),
          projectPath,
        })
      );
    });
  }

  loadProjects(renameInfo?: { newFile: TAbstractFile; oldPath: string }): void {
    const toStore: ProjectFolderContents = {};
    this.watchedDraftFolders.forEach(({ draftsPath, projectPath }) => {
      toStore[projectPath] = {};
      const folder = this.vault.getAbstractFileByPath(draftsPath);
      if (!(folder instanceof TFolder)) {
        return;
      }
      // Recurse all watched projects' draft folders.
      // Because recursion, we know drafts will be encountered before their children.
      Vault.recurseChildren(folder, (abstractFile) => {
        const status = membership(abstractFile, draftsPath);
        if (status === DraftsMembership.Draft) {
          toStore[projectPath][abstractFile.name] = [];
          // We only care about folders if they're draft folders
        } else if (
          status === DraftsMembership.Scene &&
          abstractFile instanceof TFile
        ) {
          // We only care about files if they're members of a draft
          toStore[projectPath][abstractFile.parent.name].push(
            abstractFile.basename
          );
        }
      });
    });
    projectMetadata.update((metadata) => {
      // Sync files on disk with scenes in metadata;
      // Existing files are sorted by scene order,
      // new ones are added to the bottom.
      const newMetadata = cloneDeep(metadata);
      Object.keys(toStore).forEach((projectPath) => {
        // If a draft has been renamed, sub in the renamed draft in metadata
        if (renameInfo && renameInfo.newFile instanceof TFolder) {
          const oldFolder = renameInfo.oldPath.split("/").slice(-1)[0];
          const newFolder = renameInfo.newFile.name;
          const draftIndex = newMetadata[projectPath].drafts.findIndex(
            (d) => d.folder === oldFolder
          );
          if (draftIndex >= 0) {
            const draft = newMetadata[projectPath].drafts[draftIndex];
            draft.folder = newFolder;
            draft.name = newFolder;
            newMetadata[projectPath].drafts[draftIndex] = draft;
          }
        }

        const metadataLookup = buildDraftsLookup(
          newMetadata[projectPath].drafts
        );
        Object.keys(toStore[projectPath]).forEach((draftPath) => {
          const metadataDraft = metadataLookup[draftPath];
          const metadataScenes = metadataDraft ? metadataDraft.scenes : [];
          const fileScenes = toStore[projectPath][draftPath];

          const existingScenes: string[] = [];
          metadataScenes.forEach((s) => {
            if (fileScenes.contains(s)) {
              // Retain existing scene
              existingScenes.push(s);
            } else if (
              renameInfo &&
              renameInfo.newFile instanceof TFile &&
              fileScenes.contains(renameInfo.newFile.basename)
            ) {
              // Swap in a renamed file if it matches the full path
              const f = this.watchedDraftFolders.find(
                (f) => f.projectPath === projectPath
              );
              if (
                f &&
                normalizePath(`${f.draftsPath}/${draftPath}/${s}.md`) ===
                  renameInfo.oldPath
              ) {
                existingScenes.push(renameInfo.newFile.basename);
              }
            }
          });

          const newScenes: string[] = fileScenes.filter(
            (s) => !existingScenes.contains(s)
          );
          const scenes = [...existingScenes, ...newScenes];

          const draftIndex = newMetadata[projectPath].drafts.findIndex(
            (d) => d.folder === draftPath
          );
          if (draftIndex >= 0) {
            newMetadata[projectPath].drafts[draftIndex].scenes = scenes;
          } else {
            newMetadata[projectPath].drafts.push({
              name: draftPath,
              folder: draftPath,
              scenes,
            });
          }
        });

        // Delete any orphaned drafts that are in metadata but no longer on disk
        const fileDrafts = Object.keys(toStore[projectPath]);
        newMetadata[projectPath].drafts = newMetadata[
          projectPath
        ].drafts.filter((d) => fileDrafts.contains(d.folder));
      });
      return newMetadata;
    });
  }

  destroy(): void {
    this.unsubscribeSettings();
  }

  fileCreated(abstractFile: TAbstractFile): void {
    const status = this.anyMembership(abstractFile);
    if (status === DraftsMembership.None) {
      return;
    }
    // We could do this more intelligently by making minimal edits to the store,
    // but for now let's just recalculate it. It's not clear to me yet how expensive
    // recursing children is.
    this.loadProjects();
  }

  fileDeleted(abstractFile: TAbstractFile): void {
    // We can't do normal status test here because a deleted file's parent is null.
    const reload = !!this.watchedDraftFolders.find(({ draftsPath }) =>
      abstractFile.path.startsWith(draftsPath)
    );
    if (!reload) {
      return;
    }
    // We could do this more intelligently by making minimal edits to the store,
    // but for now let's just recalculate it. It's not clear to me yet how expensive
    // recursing children is.
    this.loadProjects();
  }

  fileRenamed(abstractFile: TAbstractFile, oldPath: string): void {
    const newPath = abstractFile.path;
    // First handle any project renames, as those happen in settings
    const folder = this.watchedDraftFolders.find(
      (f) => f.projectPath === oldPath
    );
    if (folder) {
      console.log("[Longform] A project has been renamed; updating caches…");
      pluginSettings.update((s) => {
        const projects = s.projects;
        const project = s.projects[oldPath];
        project.path = newPath;
        projects[newPath] = project;
        delete s.projects[oldPath];
        let selectedProject = s.selectedProject;
        if (selectedProject === oldPath) {
          selectedProject = newPath;
        }
        const newSettings = {
          ...s,
          selectedProject,
          projects,
        };
        return newSettings;
      });
      currentProjectPath.update((p) => {
        if (p === oldPath) {
          return newPath;
        }
        return p;
      });
      projectMetadata.update((m) => {
        const project = m[oldPath];
        m[newPath] = project;
        delete m[oldPath];
        return m;
      });
      return;
    }

    const status = this.anyMembership(abstractFile, oldPath);
    if (status === DraftsMembership.None) {
      return;
    }
    // If the current draft was renamed, update that store first.
    if (
      status === DraftsMembership.Draft &&
      oldPath.endsWith(get(currentDraftPath))
    ) {
      currentDraftPath.set(abstractFile.name);
    }

    // We could do this more intelligently by making minimal edits to the store,
    // but for now let's just recalculate it. It's not clear to me yet how expensive
    // recursing children is.
    this.loadProjects({ newFile: abstractFile, oldPath });
  }

  private anyMembership(
    abstractFile: TAbstractFile,
    oldPath?: string
  ): DraftsMembership {
    for (const { draftsPath } of this.watchedDraftFolders) {
      if (oldPath && oldPath.startsWith(draftsPath)) {
        return oldPath.endsWith(".md")
          ? DraftsMembership.Scene
          : DraftsMembership.Draft;
      }
      const status = membership(abstractFile, draftsPath);
      if (status !== DraftsMembership.None) {
        return status;
      }
    }
    return DraftsMembership.None;
  }
}
