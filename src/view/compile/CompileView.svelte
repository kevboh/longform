<script lang="ts">
  import { Vault, normalizePath } from "obsidian";

  import { compile } from "src/compile";
  import { getContext } from "svelte";
  import {
    currentDraft,
    currentDraftPath,
    currentProject,
    currentProjectPath,
    pluginSettings,
  } from "../stores";

  let targetPath: string = "";
  if ($currentProjectPath && $pluginSettings.projects[$currentProjectPath]) {
    const draftsFolder =
      $pluginSettings.projects[$currentProjectPath].draftsPath;
    targetPath = normalizePath(
      `${$currentProjectPath}/${draftsFolder}/${$currentDraftPath}-compiled`
    );
  }
  let includeHeaders: boolean = false;
  let status: string = "";

  const getVault: () => Vault = getContext("getVault");
  function doCompile() {
    compile(getVault(), $currentProjectPath, $currentDraftPath, targetPath, {
      includeHeaders,
      reportProgress: (_status, complete) => {
        status = _status;
        if (complete) {
          setTimeout(() => {
            status = "";
          }, 5000);
        }
      },
    });
  }

  let error: string | null = null;
  $: {
    if (targetPath.length === 0) {
      error = null;
    } else if (
      targetPath
        .split("/")
        .slice(-1)[0]
        .match(/[\/\\:]/g)
    ) {
      error = "A file cannot contain the characters: \\ / :";
    } else {
      error = null;
    }
  }
</script>

<p class="explanation">
  Compilation is a <a href="https://github.com/kevboh/longform/labels/compile"
    >work in progress</a
  >. While I plan to add support for many custom workflows, for now you can use
  the Compile feature to stitch all the scenes in a draft together into one big
  note.
</p>

{#if $currentProject && $currentDraft}
  <div class="compile-container">
    <div class="compile-option">
      <label for="compile-target">Write compiled result to:</label>
      <input
        id="compile-target-path"
        name="compile-target"
        type="text"
        placeholder="vault/path/to/compiled-note"
        bind:value={targetPath}
        class:invalid={!!error}
      />
      <p class="explanation">
        The parent folders of this path must already exist in your vault.
      </p>
      {#if error}
        <p>{error}</p>
      {/if}
    </div>
    <div class="compile-option">
      <label for="include-headers">Add note titles as chapter headings</label>
      <input
        type="checkbox"
        name="include-headers"
        bind:checked={includeHeaders}
      />
      <p class="explanation">
        When selected, this option inserts a # tag with each note’s title above
        that note’s contents in the compilation result.
      </p>
    </div>

    <button
      class="compile-button"
      on:click={doCompile}
      disabled={targetPath.length === 0 || !!error}>Compile!</button
    >
    {#if status.length > 0}
      <p class="compile-status">{status}</p>
    {/if}
  </div>
{/if}

<style>
  .explanation {
    font-size: 10px;
    line-height: 12px;
  }

  .compile-container {
    border-top: 1px solid var(--text-muted);
  }

  .compile-option {
    margin: 12px 0;
  }

  label {
    font-size: 12px;
    color: var(--text-muted);
  }

  #compile-target-path {
    width: 100%;
    font-size: 14px;
    line-height: 20px;
  }

  #compile-target-path.invalid {
    color: var(--text-error);
  }

  .compile-button {
    background-color: var(--interactive-accent);
    color: var(--text-on-accent);
  }

  .compile-button:disabled {
    background-color: var(--text-muted);
    color: var(--text-faint);
  }

  .compile-status {
    color: var(--interactive-success);
    font-size: 10px;
    line-height: 12px;
  }
</style>
