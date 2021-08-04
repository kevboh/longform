import type { TFile } from "obsidian";
import { derived, writable } from "svelte/store";
import {
  IndexFileMetadata,
  LongformPluginSettings,
  ProjectFolderContents,
  ProjectDetails,
  DEFAULT_SETTINGS,
} from "../model/types";

export const initialized = writable<boolean>(false);
export const pluginSettings =
  writable<LongformPluginSettings>(DEFAULT_SETTINGS);
export const projectMetadata = writable<Record<string, IndexFileMetadata>>({});
export const projectFolderContents = writable<ProjectFolderContents>({});
export const projects = derived(
  [pluginSettings, projectMetadata, projectFolderContents],
  ([$pluginSettings, $projectMetadata, $projectFolderContents]) => {
    const p: Record<string, ProjectDetails> = {};
    Object.keys($pluginSettings.projects).forEach((projectPath) => {
      if (
        $projectMetadata[projectPath] &&
        $projectFolderContents[projectPath]
      ) {
        p[projectPath] = {
          ...$pluginSettings.projects[projectPath],
          ...$projectMetadata[projectPath],
        };
      } else {
        p[projectPath] = {
          ...$pluginSettings.projects[projectPath],
          version: -1,
          drafts: [],
        };
      }
    });
    return p;
  }
);
export const currentProjectPath = writable<string | null>(null);
export const currentProject = derived(
  [projects, currentProjectPath],
  ([$projects, $currentProjectPath]) => {
    const project = $projects[$currentProjectPath];
    return project || null;
  }
);
export const currentDraftPath = writable<string | null>(null);
export const currentDraft = derived(
  [currentProject, currentDraftPath],
  ([$currentProject, $currentDraftPath]) => {
    if (!$currentProject || !$currentProject.drafts || !$currentDraftPath) {
      return null;
    }
    return (
      $currentProject.drafts.find((d) => d.folder === $currentDraftPath) || null
    );
  }
);
export const activeFile = writable<TFile | null>(null);
