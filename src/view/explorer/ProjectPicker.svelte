<script lang="ts">
  import {
    projects,
    selectedDraftVaultPath,
    selectedProjectHasMultipleDrafts,
    selectedProject,
    selectedDraft,
  } from "../../model/stores";
  import { last } from "lodash";
  import { getContext } from "svelte";
  import { draftTitle } from "src/model/draft-utils";
  import { Keymap, type PaneType } from "obsidian";

  const openFileAtPath: (path: string, paneType: PaneType | boolean) => void =
    getContext("onSceneClick");

  // Map current projects to options for select element
  let projectOptions: string[] = [];
  $: {
    projectOptions = Object.keys($projects);
  }

  let draftOptions: { path: string; title: string }[] = [];
  $: {
    draftOptions = $selectedProject
      ? $selectedProject.map((d) => ({
          path: d.vaultPath,
          title: draftTitle(d),
        }))
      : [];
  }

  // Add some indirection around project picking to make sure that selecting a project
  // with multiple drafts picks the latest draft by default, and doesn't try to select
  // the previous draft on a new project.
  function projectSelected(event: Event) {
    // @ts-ignore
    const title = event.target.value;
    if ($selectedDraft && title === $selectedDraft.title) {
      return;
    }
    const newProject = $projects[title];
    let draftPath: string;
    if (newProject && newProject.length > 1) {
      draftPath = last(newProject).vaultPath;
    } else {
      draftPath = newProject[0].vaultPath;
      if (newProject[0].format === "single") {
        openFileAtPath(draftPath, false);
      }
    }
    $selectedDraftVaultPath = draftPath;
  }

  function onDraftClick(e: MouseEvent) {
    openFileAtPath($selectedDraft.vaultPath, Keymap.isModEvent(e));
  }
</script>

<div id="project-picker-container">
  {#if projectOptions.length > 0}
    <div id="project-picker">
      <div class="select" id="select-projects">
        <select
          name="projects"
          value={$selectedDraft ? $selectedDraft.title : projectOptions[0]}
          on:change={projectSelected}
        >
          {#each projectOptions as projectOption}
            <option class="projectOption" value={projectOption}
              >{projectOption}</option
            >
          {/each}
        </select>
      </div>
      {#if $selectedProjectHasMultipleDrafts}
        <span class="right-arrow" />
        <div class="select" id="select-drafts">
          <select name="drafts" bind:value={$selectedDraftVaultPath}>
            {#each draftOptions as draftOption}
              <option value={draftOption.path}>{draftOption.title}</option>
            {/each}
          </select>
        </div>
      {/if}
    </div>
    {#if $selectedDraft}
      <div class="current-draft-path" on:click={(e) => onDraftClick(e)}>
        {$selectedDraft.vaultPath}
      </div>
    {/if}
  {:else}
    <p>
      To begin, find or create a folder somewhere in your vault in which you
      would like to create your novel. Right-click it and select
      <code>Create Longform Project.</code>
    </p>
  {/if}
</div>

<style>
  #project-picker-container {
    margin-bottom: var(--size-4-2);
  }

  select {
    background-color: transparent;
    border: var(--input-border-width) solid var(--background-modifier-border);
    border-radius: var(--input-radius);
    padding: var(--size-4-2);
    width: 100%;
    height: 100%;
    font-family: inherit;
    font-size: 1em;
    cursor: inherit;
    line-height: inherit;
    outline: none;
    box-shadow: none;
  }

  .select {
    cursor: pointer;
  }

  .select > select {
    background-color: var(--background-secondary);
    color: var(--text-muted);
    appearance: auto;
  }

  .select > select:hover {
    color: var(--text-normal);
    box-shadow: 0 0 0 2px var(--background-modifier-border-focus);
    border-color: var(--background-modifier-border-focus);
    transition:
      box-shadow 0.15s ease-in-out,
      border 0.15s ease-in-out;
  }

  .select select option {
    font-size: var(--nav-item-size);
    padding: var(--nav-item-padding);
  }

  .select select option:checked,
  .select select option:hover {
    box-shadow: 0 0 10px 100px var(--background-modifier-hover) inset;
    color: inherit;
  }

  .right-arrow {
    display: grid;
  }

  .right-arrow::after {
    content: "";
    width: var(--font-smallest);
    height: var(--size-4-2);
    background-color: var(--text-muted);
    clip-path: polygon(50% 0%, 50% 100%, 100% 50%);
  }

  .current-draft-path {
    color: var(--text-faint);
    font-size: var(--font-smallest);
    padding: 0 0 var(--size-4-1) var(--size-4-3);
  }

  .current-draft-path:hover {
    color: var(--text-accent);
    cursor: pointer;
  }
</style>
