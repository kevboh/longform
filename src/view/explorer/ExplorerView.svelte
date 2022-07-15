<script lang="ts">
  import CompileView from "../compile/CompileView.svelte";

  import { selectedDraft } from "src/model/stores";

  import { Tab, Tabs, TabList, TabPanel } from "../tabs";
  import NewSceneField from "./NewSceneField.svelte";
  import ProjectPicker from "./ProjectPicker.svelte";
  import SceneList from "./SceneList.svelte";
  import ProjectDetails from "./ProjectDetails.svelte";
  import { needsMigration } from "src/model/migration";
  import { getContext } from "svelte";

  const _migrate: () => void = getContext("migrate");
  function doMigration() {
    _migrate();
  }
</script>

{#if $needsMigration}
  <div>
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
{:else}
  <ProjectPicker />
  {#if $selectedDraft && $selectedDraft.format === "scenes"}
    <div>
      <Tabs>
        <TabList>
          <Tab>Scenes</Tab>
          <Tab>Project</Tab>
          <Tab>Compile</Tab>
        </TabList>
        <TabPanel>
          <SceneList />
          <NewSceneField />
        </TabPanel>
        <TabPanel>
          <ProjectDetails />
        </TabPanel>
        <TabPanel><CompileView /></TabPanel>
      </Tabs>
    </div>
  {:else}
    <div>
      <Tabs>
        <TabList>
          <Tab>Project</Tab>
          <Tab>Compile</Tab>
        </TabList>
        <TabPanel>
          <ProjectDetails />
        </TabPanel>
        <TabPanel><CompileView /></TabPanel>
      </Tabs>
    </div>
  {/if}
{/if}

<style>
  .longform-migrate-button {
    background-color: var(--interactive-accent);
    color: var(--text-on-accent);
  }

  .longform-migrate-button:hover {
    background-color: var(--interactive-accent-hover);
  }
</style>
