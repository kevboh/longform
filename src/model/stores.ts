// projects 2.0 stores

import { derived, writable } from "svelte/store";
import { groupBy, sortBy } from "lodash";

import type { Draft, LongformPluginSettings } from "./types";
import type {
  Workflow,
  CompileStep,
} from "src/compile/steps/abstract-compile-step";

// WRITEABLE STORES

/**
 * Writeable store of whether the plugin has been initialized or not.
 * Set to `true` on the completion of the workspace's onLayoutReady callback.
 */
export const initialized = writable<boolean>(false);

/**
 * Writeable store of plugin settings, serialized as json to the plugin's data.json file.
 */
export const pluginSettings = writable<LongformPluginSettings>(null);

/**
 * Writeable store of all discovered drafts. Not coalesced into projects.
 */
export const drafts = writable<Draft[]>([]);

/**
 * Writeable store of the full, normalized path to the currently selected draft index file.
 */
export const selectedDraftVaultPath = writable<string | null>(null);

/**
 * Writeable store of all known workflows, indexed by name.
 */
export const workflows = writable<Record<string, Workflow>>({});

/**
 * Writeable store of all loaded user script steps, or `null` if none are loaded.
 */
export const userScriptSteps = writable<CompileStep[] | null>(null);

// DERIVED STORES

/**
 * Derived store of all projects—drafts grouped by title.
 *
 * If a draft does not have a title, will use filename without extension
 * (and thus be a single-draft project unless you use the same filename).
 */
export const projects = derived([drafts], ([$drafts]) => {
  const getTitle = (draft: Draft): string => {
    return draft.title;
  };

  const sortedDrafts = sortBy($drafts, getTitle);
  return groupBy(sortedDrafts, getTitle) as Record<string, Draft[]>;
});

/**
 * Derived store of the draft corresponding to the currently selected vault path.
 */
export const selectedDraft = derived(
  [drafts, selectedDraftVaultPath],
  ([$drafts, $selectedDraftVaultPath]) => {
    if (!$selectedDraftVaultPath) {
      return null;
    }
    return $drafts.find((d) => d.vaultPath === $selectedDraftVaultPath) ?? null;
  }
);

/**
 * Derived store of all drafts whose title matches that of the currently selected draft.
 */
export const selectedProject = derived(
  [projects, selectedDraft],
  ([$projects, $selectedDraft]) => {
    if (!$selectedDraft) {
      return null;
    }

    return $projects[$selectedDraft.title] ?? null;
  }
);

/**
 * Derived store that is true if the current project consists of multiple drafts.
 */
export const selectedProjectHasMultipleDrafts = derived(
  [selectedProject],
  ([$selectedProject]) => $selectedProject && $selectedProject.length > 1
);

/**
 * Derived store corresponding to the current draft's workflow, if there is a current draft
 * and it has an associated workflow.
 */
export const currentWorkflow = derived(
  [workflows, selectedDraft],
  ([$workflows, $selectedDraft]) => {
    if ($selectedDraft) {
      const currentWorkflowName = $selectedDraft.workflow;
      if (currentWorkflowName) {
        const workflow = $workflows[currentWorkflowName];
        return workflow;
      }
      return null;
    }
    return null;
  }
);
