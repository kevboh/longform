<script lang="ts">
  import { getContext } from "svelte";
  import { selectedDraft } from "src/model/stores";
  import { invalidFilenameCharacters, isValidFilename } from "../utils";

  let newSceneName: string = "";
  let newSceneInput: HTMLElement;

  const sceneNames =
    $selectedDraft.format === "scenes"
      ? $selectedDraft.scenes.map((s) => s.title)
      : [];

  let error: string | null = null;
  $: {
    if (newSceneName.length === 0) {
      error = null;
    } else if (sceneNames.contains(newSceneName)) {
      error = "A scene with this name already exists in this draft.";
    } else if (!isValidFilename(newSceneName)) {
      error = `A scene name cannot contain the characters: ${invalidFilenameCharacters()}`;
    } else {
      error = null;
    }
  }

  const onNewScene: (name: string, open: boolean) => void =
    getContext("onNewScene");
  function onNewSceneEnter(open: boolean) {
    if (newSceneName.length > 0 && !error) {
      onNewScene(newSceneName, open);
      newSceneName = "";
    }
  }
</script>

<div class="new-scene-container">
  <input
    id="new-scene"
    type="text"
    placeholder="New Scene…"
    bind:value={newSceneName}
    bind:this={newSceneInput}
    on:keydown={(e) => {
      if (e.key === "Enter") {
        onNewSceneEnter(!e.shiftKey);
      } else if (e.key === "Escape") {
        newSceneName = "";
        newSceneInput.blur();
      }
    }}
    class:invalid={!!error}
  />
  {#if error}
    <p>{error}</p>
  {/if}
</div>

<style>
  .new-scene-container {
    margin: 0;
    border-top: var(--border-width) solid var(--text-muted);
    padding: var(--size-4-1) 0;
  }

  #new-scene {
    padding: 0;
    border: 0;
    background: inherit;
    font-size: 1em;
    line-height: var(--h3-line-height);
    width: 100%;
  }

  #new-scene.invalid {
    color: var(--text-error);
  }

  #new-scene::placeholder {
    font-style: italic;
  }
</style>
