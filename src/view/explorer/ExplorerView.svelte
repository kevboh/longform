<script lang="ts">
  import { normalizePath } from "obsidian";
  import { setContext } from "svelte";
  import CompileView from "../compile/CompileView.svelte";

  import {
    currentDraft,
    currentDraftPath,
    currentProject,
    currentProjectPath,
    pluginSettings,
  } from "../stores";
  import { Tab, Tabs, TabList, TabPanel } from "../tabs";
  import DraftList from "./DraftList.svelte";
  import NewDraftField from "./NewDraftField.svelte";
  import NewSceneField from "./NewSceneField.svelte";
  import ProjectPicker from "./ProjectPicker.svelte";
  import SceneList from "./SceneList.svelte";

  // Create a fully-qualified path to a draft from its name.
  function makeDraftPath(name: string): string | null {
    if ($currentProjectPath) {
      const draftsFolder =
        $pluginSettings.projects[$currentProjectPath].draftsPath;
      return normalizePath(`${$currentProjectPath}/${draftsFolder}/${name}/`);
    }
    return null;
  }
  setContext("makeDraftPath", makeDraftPath);

  // Create a fully-qualified path to a scene from its name.
  function makeScenePath(name: string, draft?: string): string | null {
    const draftPath = makeDraftPath(draft || $currentDraftPath);
    if (draftPath) {
      return normalizePath(`${draftPath}/${name}.md`);
    }
    return null;
  }
  setContext("makeScenePath", makeScenePath);
</script>

<ProjectPicker />
<Tabs>
  <TabList>
    <Tab>Scenes</Tab>
    <Tab>Drafts</Tab>
    <Tab>Compile</Tab>
  </TabList>
  <TabPanel>
    {#if $currentDraft}
      <SceneList />
      <NewSceneField />
    {/if}
  </TabPanel>
  <TabPanel>
    {#if $currentProject}
      <DraftList />
      <NewDraftField />
    {/if}
  </TabPanel>
  <TabPanel><CompileView /></TabPanel>
</Tabs>
