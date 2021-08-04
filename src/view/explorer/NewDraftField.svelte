<script lang="ts">
  import { getContext } from "svelte";

  import {
    currentDraftPath,
    currentProject,
    currentProjectPath,
    projectMetadata,
  } from "../stores";

  const makeDraftPath: (scene: string) => string = getContext("makeDraftPath");
  const makeScenePath: (scene: string, draft?: string) => string =
    getContext("makeScenePath");

  let newDraftName: string = "";
  let newDraftInput: HTMLElement;
  let copyFromDraft: string | null = null;

  let error: string | null = null;
  $: {
    if (newDraftName.length === 0) {
      error = null;
    } else if ($currentProject.drafts.find((d) => d.folder === newDraftName)) {
      error = "A draft with this name already exists.";
    } else if (newDraftName.match(/[\/\\:]/g)) {
      error = "A draft name cannot contain the characters: \\ / :";
    } else {
      error = null;
    }
  }

  const onNewDraft: (
    path: string,
    copying?: { from: string; to: string }[]
  ) => Promise<void> = getContext("onNewDraft");
  async function onNewDraftEnter() {
    if (newDraftName.length > 0 && !error) {
      const draftPath = makeDraftPath(newDraftName);
      if (draftPath) {
        let copying: { from: string; to: string }[] = [];
        let newDraftSceneOrder: string[];
        if (copyFromDraft) {
          const sourceDraft = $currentProject.drafts.find(
            (d) => d.folder === copyFromDraft
          );
          if (sourceDraft) {
            newDraftSceneOrder = sourceDraft.scenes;
            copying = sourceDraft.scenes.map((s) => ({
              from: makeScenePath(s, sourceDraft.folder),
              to: makeScenePath(s, newDraftName),
            }));
          }
        }

        await onNewDraft(draftPath, copying);
        $currentDraftPath = newDraftName;

        if (copyFromDraft && newDraftSceneOrder) {
          const newDraftIndex = $projectMetadata[
            $currentProjectPath
          ].drafts.findIndex((d) => d.folder === newDraftName);
          if (newDraftIndex >= 0) {
            const newDraft =
              $projectMetadata[$currentProjectPath].drafts[newDraftIndex];
            newDraft.scenes = newDraftSceneOrder;
            $projectMetadata[$currentProjectPath].drafts[newDraftIndex] =
              newDraft;
          }
        }
        newDraftName = "";
      }
    }
  }
</script>

<div class="new-draft-container">
  <input
    id="new-draft"
    type="text"
    placeholder="New Draft…"
    bind:value={newDraftName}
    bind:this={newDraftInput}
    on:keydown={(e) => {
      if (e.key === "Enter") {
        onNewDraftEnter();
      } else if (e.key === "Escape") {
        newDraftName = "";
        newDraftInput.blur();
      }
    }}
    class:invalid={!!error}
  />
  {#if error}
    <p>{error}</p>
  {/if}
  {#if newDraftName.length > 0}
    <select name="copyFrom" bind:value={copyFromDraft}>
      <option value={null}>Empty Draft</option>
      {#each $currentProject.drafts as draftOption}
        <option value={draftOption.folder}
          >{`Copy of ${draftOption.name}`}</option
        >
      {/each}
    </select>
    <p class="draft-description">
      {#if newDraftName && copyFromDraft}
        {newDraftName} will start as a copy of {copyFromDraft}.
      {:else if newDraftName}
        {newDraftName} will start as an empty folder.
      {/if}
    </p>
  {/if}
</div>

<style>
  .new-draft-container {
    margin: 0;
    border-top: 1px solid var(--text-muted);
    padding: 4px 0;
  }

  #new-draft {
    padding: 0;
    border: 0;
    background: inherit;
    font-size: 14px;
    line-height: 20px;
    width: 100%;
  }

  #new-draft.invalid {
    color: var(--text-error);
  }

  #new-draft::placeholder {
    font-style: italic;
  }

  .draft-description {
    font-size: 10px;
    line-height: 12px;
    color: var(--text-muted);
  }
</style>
