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

  const openFileAtPath: (path: string, newLeaf: boolean) => void =
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
      openFileAtPath(draftPath, false);
    }
    $selectedDraftVaultPath = draftPath;
  }

  function onDraftClick(e: MouseEvent) {
    openFileAtPath($selectedDraft.vaultPath, e.metaKey);
  }
</script>

<div id="project-picker-container">
  {#if projectOptions.length > 0}
    <div id="project-picker">
      <div class="select" id="select-projects">
        <select
          name="projects"
          value={$selectedDraft && $selectedDraft.title}
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
      To use Longform, start by marking a folder as a Longform project by
      right-clicking it and selecting "Mark as Longform project."
    </p>
  {/if}
</div>

<style>
  #project-picker-container {
    margin-bottom: 8px;
  }

  select {
    background-color: transparent;
    border: none;
    padding: 0;
    margin: 0;
    width: 100%;
    font-family: inherit;
    font-size: inherit;
    cursor: inherit;
    line-height: inherit;
    outline: none;
  }

  .select {
    cursor: pointer;
  }

  .select > select {
    color: var(--text-accent);
  }

  .select > select:hover {
    text-decoration: underline;
    color: var(--text-accent-hover);
  }

  #project-picker {
    display: flex;
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
  }

  .right-arrow {
    display: grid;
  }

  .right-arrow::after {
    content: "";
    width: 0.8em;
    height: 0.5em;
    background-color: var(--text-muted);
    clip-path: polygon(50% 0%, 50% 100%, 100% 50%);
  }

  .current-draft-path {
    color: var(--text-muted);
    font-size: 10px;
    padding: 0 4px;
    line-height: 12px;
  }

  .current-draft-path:hover {
    color: var(--text-accent);
    cursor: pointer;
  }
</style>
