<script lang="ts">
  import { normalizePath } from "obsidian";
  import {
    currentDraftPath,
    currentProject,
    currentProjectPath,
    initialized,
    projects,
  } from "../stores";

  // Map current projects to options for select element
  let projectOptions: { name: string; path: string }[] = [];
  $: {
    projectOptions = Object.keys($projects).map((path) => ({
      name: path.split("/").slice(-1)[0],
      path,
    }));
  }

  // Recover if you've changed projects and there's no matching draft folder
  // by setting the current draft to the last one in the project.
  $: if (
    $initialized &&
    $currentProject &&
    !$currentProject.drafts.find((d) => d.folder === $currentDraftPath)
  ) {
    const drafts = $currentProject.drafts;
    if (drafts.length > 0) {
      $currentDraftPath = drafts[drafts.length - 1].folder;
    } else {
      $currentDraftPath = null;
    }
  }
</script>

<div id="project-picker-container">
  {#if projectOptions.length > 0}
    <div id="project-picker">
      <div class="select" id="select-projects">
        <select name="projects" bind:value={$currentProjectPath}>
          {#each projectOptions as projectOption}
            <option class="projectOption" value={projectOption.path}
              >{projectOption.name}</option
            >
          {/each}
        </select>
      </div>
      {#if $currentDraftPath && $currentProject && $currentProject.drafts}
        <span class="right-arrow" />
        <div class="select" id="select-drafts">
          <select name="drafts" bind:value={$currentDraftPath}>
            {#each $currentProject.drafts as draftOption}
              <option value={draftOption.folder}>{draftOption.name}</option>
            {/each}
          </select>
        </div>
      {/if}
    </div>
    {#if $currentDraftPath}
      <div class="current-draft-path">
        {normalizePath(`${$currentProjectPath}/${$currentDraftPath}`)}
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
    padding: 0 8px;
    line-height: 12px;
  }
</style>
