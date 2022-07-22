import type { TFile } from "obsidian";
import { derived, writable } from "svelte/store";

import {
  drafts,
  draftWordCounts,
  selectedDraft,
  sessions,
  pluginSettings,
} from "src/model/stores";
import {
  type SceneWordStats,
  statsForScene,
  fileNameFromPath,
} from "src/model/note-utils";
import { draftForPath } from "src/model/scene-navigation";
import type { Draft, DraftWordCounts } from "src/model/types";

// Writable stores
export const activeFile = writable<TFile | null>(null);

export type ExplorerTab = "Scenes" | "Project" | "Compile";
export const selectedTab = writable<ExplorerTab>("Project");

const statsFor = (
  file: TFile,
  draft: Draft,
  drafts: Draft[],
  wordCounts: DraftWordCounts
): SceneWordStats | null => {
  if (draft && wordCounts) {
    return statsForScene(file, draft, drafts, wordCounts);
  }
  return null;
};

// Derived stores
export const selectedDraftWordCountStatus = derived(
  [activeFile, selectedDraft, drafts, draftWordCounts],
  ([$activeFile, $selectedDraft, $drafts, $draftWordCounts]) =>
    statsFor($activeFile, $selectedDraft, $drafts, $draftWordCounts)
);

export const activeFileWordCountStatus = derived(
  [activeFile, selectedDraft, drafts, draftWordCounts],
  ([$activeFile, , $drafts, $draftWordCounts]) =>
    statsFor(
      $activeFile,
      $activeFile && draftForPath($activeFile.path, $drafts),
      $drafts,
      $draftWordCounts
    )
);

export const goalProgress = derived(
  [selectedDraft, sessions, pluginSettings, activeFile, drafts],
  ([$selectedDraft, $sessions, $pluginSettings, $activeFile, $drafts]) => {
    if (!$selectedDraft || $sessions.length === 0 || !$pluginSettings) {
      return 0;
    }

    const latestSession = $sessions[0];
    const goal = $pluginSettings.sessionGoal;

    if ($pluginSettings.applyGoalTo === "all") {
      return Math.min(latestSession.total / goal, 1);
    } else if ($pluginSettings.applyGoalTo === "project") {
      const draftTotal = latestSession.drafts[$selectedDraft.vaultPath];
      if (draftTotal) {
        return Math.min(draftTotal.total / goal, 1);
      } else {
        return 0;
      }
    } else {
      if (!$activeFile) {
        return 0;
      }
      const draft = draftForPath($activeFile.path, $drafts);
      if (!draft) {
        return 0;
      }
      const name = fileNameFromPath($activeFile.path);
      const draftTotals = latestSession.drafts[draft.vaultPath];
      if (!draftTotals) {
        return 0;
      }
      if (draft.format === "single") {
        return draftTotals.total;
      } else {
        const sceneTotal = draftTotals.scenes[name] ?? 0;
        console.log(draftTotals, sceneTotal);
        return Math.min(sceneTotal / goal, 1);
      }
    }
  }
);
