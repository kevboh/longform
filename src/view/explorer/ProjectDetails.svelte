<script lang="ts">
  import { last } from "lodash";
  import { draftForPath } from "src/model/scene-navigation";
  import { pluginSettings, projects } from "src/model/stores";
  import {
    drafts,
    selectedDraft,
    selectedDraftVaultPath,
  } from "src/model/stores";
  import {
    selectedDraftWordCountStatus,
    goalProgress,
    activeFile,
  } from "../stores";
  import DraftList from "./DraftList.svelte";
  // import NewDraftField from "./NewDraftField.svelte";

  function titleChanged(event: Event) {
    let newTitle = (event.target as any).value;
    drafts.update((_drafts) => {
      const currentDraftIndex = _drafts.findIndex(
        (d) => d.vaultPath === $selectedDraftVaultPath
      );
      if (currentDraftIndex >= 0) {
        const currentDraft = _drafts[currentDraftIndex];
        const currentTitle = currentDraft.title;
        let titleInFrontmatter = true;

        if (newTitle.length === 0) {
          newTitle = last(
            _drafts[currentDraftIndex].vaultPath.split("/")
          ).split(".md")[0];
          titleInFrontmatter = false;
        }

        return _drafts.map((d) => {
          if (d.title === currentTitle) {
            d.title = newTitle;
            d.titleInFrontmatter = titleInFrontmatter;
          }
          return d;
        });
      }
      return _drafts;
    });
  }

  let projectCount: number;
  let draftCount: number | null;
  let sceneCount: number | null;
  $: {
    if ($selectedDraftWordCountStatus) {
      const { scene, draft, project } = $selectedDraftWordCountStatus;

      projectCount = project;
      draftCount = $projects[$selectedDraft.title].length > 1 ? draft : null;
      sceneCount = $selectedDraft.format === "scenes" ? scene : null;
    }
  }

  let showProgress = false;
  $: {
    showProgress =
      $activeFile &&
      $selectedDraft &&
      draftForPath($activeFile.path, $drafts).vaultPath ===
        $selectedDraft.vaultPath;
  }

  let goalPercentage: number;
  let goalDescription: string;
  $: {
    goalPercentage = Math.ceil($goalProgress * 100);
    goalDescription = `${$goalProgress * $pluginSettings.sessionGoal}/${
      $pluginSettings.sessionGoal
    }`;
  }

  function pluralize(
    count: number,
    noun: string,
    pluralNoun: string | null = null
  ) {
    if (count === undefined) {
      return "";
    }
    if (count === 1) {
      return `${count.toLocaleString()} ${noun}`;
    } else if (pluralNoun) {
      return `${count.toLocaleString()} ${pluralNoun}`;
    } else {
      return `${count.toLocaleString()} ${noun}s`;
    }
  }
</script>

<div>
  {#if $selectedDraft}
    <div class="longform-project-section">
      <h4>Project Metadata</h4>
      <label for="longform-project-title">Title</label>
      <input
        id="longform-project-title"
        type="text"
        value={$selectedDraft.title}
        on:change={titleChanged}
      />
    </div>
  {/if}
  <div
    class="longform-project-section word-counts"
    style={`--progress-text-color:${
      goalPercentage >= 43 ? "var(--text-on-accent)" : "var(--text-accent)"
    }`}
  >
    <h4>Word Count</h4>
    {#if showProgress}
      <div
        class="progress"
        data-label={goalDescription}
        title={goalDescription}
      >
        <div class="value" style={`width:${goalPercentage}%;`} />
      </div>
    {/if}
    {#if sceneCount}
      <p title="Word count in this scene of this project.">
        <strong>Scene:</strong>
        {pluralize(sceneCount, "word")}
      </p>
    {/if}
    {#if draftCount}
      <p title="Word count in just this draft of this project.">
        <strong>Draft:</strong>
        {pluralize(draftCount, "word")}
      </p>
    {/if}
    <p title="Word count across all drafts of this project.">
      <strong>Project:</strong>
      {pluralize(projectCount, "word")}
    </p>
  </div>
  <div class="longform-project-section">
    <h4>Drafts</h4>
    <DraftList />
    <!-- <NewDraftField /> -->
  </div>
</div>

<style>
  .longform-project-section {
    margin-top: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--background-modifier-border);
  }

  h4 {
    font-weight: bold;
    margin: 0;
    padding: 0;
    font-size: 1rem;
  }

  input {
    width: 100%;
    color: var(--text-accent);
  }

  label {
    font-weight: bold;
    font-size: 85%;
    color: var(--text-muted);
  }

  .word-counts p {
    margin: 8px 0;
  }

  .progress {
    height: 1.5rem;
    width: 100%;
    background-color: var(--background-secondary-alt);
    border-radius: 3px;
    position: relative;
    overflow: hidden;
  }

  .progress:before {
    content: attr(data-label);
    font-size: 0.8rem;
    color: var(--progress-text-color);
    font-weight: bold;
    position: absolute;
    text-align: center;
    top: 0px;
    left: 0;
    right: 0;
  }

  .progress .value {
    height: 100%;
    background-color: var(--text-accent);
  }
</style>
