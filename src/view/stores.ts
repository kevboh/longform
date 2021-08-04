import type { TFile } from "obsidian";
import { derived, writable } from "svelte/store";
import {
  IndexFileMetadata,
  LongformPluginSettings,
  ProjectDetails,
  DEFAULT_SETTINGS,
  ProjectLoadError,
} from "../model/types";

// Writable stores
export const initialized = writable<boolean>(false);
export const pluginSettings =
  writable<LongformPluginSettings>(DEFAULT_SETTINGS);
export const projectMetadata = writable<Record<string, IndexFileMetadata>>({});
export const currentProjectPath = writable<string | null>(null);
export const currentDraftPath = writable<string | null>(null);
export const activeFile = writable<TFile | null>(null);

// Derived stores
export const projects = derived(
  [pluginSettings, projectMetadata],
  ([$pluginSettings, $projectMetadata]) => {
    const p: Record<string, ProjectDetails> = {};
    Object.keys($pluginSettings.projects).forEach((projectPath) => {
      if ($projectMetadata[projectPath]) {
        p[projectPath] = {
          ...$pluginSettings.projects[projectPath],
          ...$projectMetadata[projectPath],
          error: ProjectLoadError.None,
        };
      } else {
        p[projectPath] = {
          ...$pluginSettings.projects[projectPath],
          version: -1,
          drafts: [],
          error: ProjectLoadError.MissingMetadata,
        };
      }
    });
    return p;
  }
);
export const currentProject = derived(
  [projects, currentProjectPath],
  ([$projects, $currentProjectPath]) => {
    const project = $projects[$currentProjectPath];
    return project || null;
  }
);
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
