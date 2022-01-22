import type { TFile } from "obsidian";
import type {
  Workflow,
  CompileStep,
} from "src/compile/steps/abstract-compile-step";
import { derived, writable } from "svelte/store";
import {
  IndexFileMetadata,
  LongformPluginSettings,
  ProjectDetails,
  ProjectLoadError,
} from "../model/types";

// Writable stores
export const initialized = writable<boolean>(false);
export const pluginSettings = writable<LongformPluginSettings>(null);
export const projectMetadata = writable<Record<string, IndexFileMetadata>>({});
export const currentProjectPath = writable<string | null>(null);
export const currentDraftPath = writable<string | null>(null);
export const activeFile = writable<TFile | null>(null);
export const workflows = writable<Record<string, Workflow>>({});
export const userScriptSteps = writable<CompileStep[] | null>(null);

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
          workflow: null,
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

// Compile stores
export const currentWorkflow = derived(
  [workflows, projectMetadata, currentProjectPath],
  ([$workflows, $projectMetadata, $currentProjectPath]) => {
    const metadata = $projectMetadata[$currentProjectPath];
    if (metadata) {
      const currentWorkflowName =
        $projectMetadata[$currentProjectPath].workflow;
      if (currentWorkflowName) {
        const workflow = $workflows[currentWorkflowName];
        return workflow;
      }
      return null;
    }
    return null;
  }
);
