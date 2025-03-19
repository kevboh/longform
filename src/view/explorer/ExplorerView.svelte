<script lang="ts">
  import CompileView from "../compile/CompileView.svelte";

  import { selectedDraft } from "src/model/stores";
  import { selectedTab } from "../stores";
  import { waitingForSync } from "src/model/stores";

  import NewSceneField from "./NewSceneField.svelte";
  import ProjectPicker from "./ProjectPicker.svelte";
  import SceneList from "./SceneList.svelte";
  import ProjectDetails from "./ProjectDetails.svelte";
  import { needsMigration } from "src/model/migration";
  import { getContext } from "svelte";
  import Tab from "./Tab.svelte";

  const _migrate: () => void = getContext("migrate");
  function doMigration() {
    _migrate();
  }

  $: {
    if (
      $selectedDraft &&
      $selectedDraft.format === "single" &&
      $selectedTab === "Scenes"
    ) {
      $selectedTab = "Project";
    }
  }
</script>

{#if $needsMigration}
  <div class="longform-explorer">
    <p>
      Longform has been upgraded and requires a migration to a new format.
      Deprecated index files will be deleted, and some scene files may move.
      It’s recommended to back up your vault before migrating.
    </p>
    <p>
      You can view the docs and an explanation of what this migration does <a
        href="https://github.com/kevboh/longform/blob/main/docs/MIGRATING_FROM_VERSION_1_TO_2.md"
        >here</a
      >.
    </p>
    <button class="longform-migrate-button" type="button" on:click={doMigration}
      >Migrate</button
    >
  </div>
{:else if $waitingForSync}
  <div class="longform-sync-wait">
    <div class="longform-spinner"></div>
    <div class="longform-sync-message">
      Waiting for Obsidian Sync to complete...
    </div>
  </div>
{:else}
  <div class="longform-explorer">
    <ProjectPicker />
    {#if $selectedDraft && $selectedDraft.format === "scenes"}
      <div>
        <div class="tabs">
          <div class="tab-list">
            <Tab tab="Scenes" />
            <Tab tab="Project" />
            <Tab tab="Compile" />
          </div>
        </div>
        {#if $selectedTab === "Scenes"}
          <div class="tab-panel-container">
            <SceneList />
            <NewSceneField />
          </div>
        {:else if $selectedTab === "Project"}
          <div class="tab-panel-container">
            <ProjectDetails />
          </div>
        {:else}
          <div class="tab-panel-container disconnected">
            <CompileView />
          </div>
        {/if}
      </div>
    {:else}
      <div>
        <div class="tabs">
          <div class="tab-list">
            <Tab tab="Project" />
            <Tab tab="Compile" />
          </div>
        </div>
        {#if $selectedTab === "Project"}
          <div class="tab-panel-container">
            <ProjectDetails />
          </div>
        {:else}
          <div class="tab-panel-container">
            <CompileView />
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .longform-explorer {
    font-size: var(--longform-explorer-font-size);
  }

  .longform-migrate-button {
    background-color: var(--interactive-accent);
    color: var(--text-on-accent);
  }

  .longform-migrate-button:hover {
    background-color: var(--interactive-accent-hover);
  }

  .tab-list {
    margin: 0;
    font-size: 0; /* To remove spacing between tabs */
  }

  .tab-panel-container {
    background: var(--background-primary);
    padding: var(--size-4-1) var(--size-4-2);
  }
  
  .tab-panel-container.disconnected {
    background: none;
    padding: 0;
  }

  .longform-sync-wait {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 2rem;
    gap: 1rem;
  }

  .longform-spinner {
    border: 3px solid var(--background-modifier-border);
    border-top: 3px solid var(--text-accent);
    border-radius: 50%;
    width: 24px;
    height: 24px;
    animation: spin 1s linear infinite;
  }

  .longform-sync-message {
    color: var(--text-muted);
    font-size: 0.8em;
    text-align: center;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
</style>
