<script lang="ts">
  import { last } from "lodash";
  import {
    drafts,
    selectedDraft,
    selectedDraftVaultPath,
  } from "src/model/stores";
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
  <div class="longform-project-section">
    <h4>Word Count</h4>
    <div>TODO</div>
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
</style>
