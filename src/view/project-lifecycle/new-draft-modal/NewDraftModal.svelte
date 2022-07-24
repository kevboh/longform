<script lang="ts">
  import { normalizePath, Setting } from "obsidian";
  import { draftTitle } from "src/model/draft-utils";
  import { selectedDraft } from "src/model/stores";
  import type { Draft } from "src/model/types";

  import { getContext, onMount } from "svelte";

  let title: string;
  let copyScenes = false;
  let checkboxContainer: HTMLElement;

  let showSceneToggle = false;
  $: {
    showSceneToggle = $selectedDraft && $selectedDraft.format === "scenes";
  }

  let valid = false;
  let draftPath: string;
  const regex = /[:\\\/]/;
  $: {
    valid = title && !regex.test(title);
    if (valid && $selectedDraft) {
      if ($selectedDraft.format === "scenes") {
        const parent = $selectedDraft.vaultPath
          .split("/")
          .slice(0, -2)
          .join("/");
        draftPath = normalizePath(`${parent}/${title}/Index.md`);
      } else {
        const parent = $selectedDraft.vaultPath
          .split("/")
          .slice(0, -1)
          .join("/");
        draftPath = normalizePath(`${parent}/${title}.md`);
      }
    }
  }

  onMount(() => {
    new Setting(checkboxContainer)
      .setName("Copy Scenes")
      .setDesc(
        "If on, all scenes in the current draft will be copied to the new one."
      )
      .addToggle((cb) => {
        cb.setValue(copyScenes);
        cb.onChange((value) => {
          copyScenes = value;
        });
      });
  });

  const createDraft: (
    newVaultPath: string,
    draft: Draft,
    draftTitle: string,
    copyScenes: boolean
  ) => Promise<void> = getContext("createDraft");
  function onCreateDraft() {
    createDraft(draftPath, $selectedDraft, title, copyScenes);
  }
</script>

<div>
  <p>
    Create a new version of this project. Use the name/version field below to
    give your draft an internal name that describes it relative to the larger
    project.
  </p>
  <div class="draft-title-container">
    <label for="longform-new-draft-title">Draft Name/Version</label>
    <input
      id="longform-new-draft-title"
      type="text"
      placeholder="Version 5_final"
      bind:value={title}
      on:keydown={(e) => {
        if (e.key === "Enter") {
          onCreateDraft();
        }
      }}
    />
  </div>
  <div bind:this={checkboxContainer} hidden={!showSceneToggle} />
  <div>
    {#if valid}
      <p>
        You are creating a new draft{#if copyScenes}
          <b>&nbsp;with copied scenes</b>{/if} from your current draft
        <span class="source-path">{draftTitle($selectedDraft)}</span>
        at
        <span class="target-path">{draftPath}</span>
      </p>
      <div class="draft-creation-container">
        <button type="button" on:click={onCreateDraft}>Create</button>
      </div>
    {/if}
  </div>
</div>

<style>
  .draft-title-container {
    margin-bottom: 16px;
  }

  label {
    font-weight: bold;
    color: var(--text-muted);
    display: block;
    font-size: 0.8rem;
  }

  input[type="text"] {
    width: 100%;
    font-size: 1.5rem;
    height: 3rem;
    padding: 8px;
  }

  .source-path {
    color: var(--text-muted);
  }

  .target-path {
    color: var(--text-accent);
  }

  .draft-creation-container {
    display: flex;
    flex-direction: row;
    justify-content: end;
  }

  .draft-creation-container button {
    font-weight: bold;
    background-color: var(--interactive-accent);
    color: var(--text-on-accent);
    margin: 0;
  }
</style>
