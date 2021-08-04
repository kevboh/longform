<script lang="ts">
  import { getContext } from "svelte";
  import { currentDraft } from "../stores";

  let newSceneName: string = "";
  let newSceneInput: HTMLElement;

  let error: string | null = null;
  $: {
    if (newSceneName.length === 0) {
      error = null;
    } else if ($currentDraft.scenes.contains(newSceneName)) {
      error = "A scene with this name already exists in this draft.";
    } else if (newSceneName.match(/[\/\\:]/g)) {
      error = "A scene name cannot contain the characters: \\ / :";
    } else {
      error = null;
    }
  }

  const makeScenePath: (scene: string) => string = getContext("makeScenePath");
  const onNewScene: (path: string) => void = getContext("onNewScene");
  function onNewSceneEnter() {
    if (newSceneName.length > 0 && !error) {
      const scenePath = makeScenePath(newSceneName);
      if (scenePath) {
        onNewScene(scenePath);
        newSceneName = "";
      }
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
        onNewSceneEnter();
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
    border-top: 1px solid var(--text-muted);
    padding: 4px 0;
  }

  #new-scene {
    padding: 0;
    border: 0;
    background: inherit;
    font-size: 14px;
    line-height: 20px;
    width: 100%;
  }

  #new-scene.invalid {
    color: var(--text-error);
  }

  #new-scene::placeholder {
    font-style: italic;
  }
</style>
