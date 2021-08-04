<script lang="ts">
  /* Note: VSCode doesn't love the use of generics + let:item
     in the html section here. I'm not sure what to do about it;
     it's valid svelte and doesn't typeerror on compile.
  */
  import type Sortable from "sortablejs";
  import { getContext } from "svelte";

  import {
    activeFile,
    currentDraft,
    currentDraftPath,
    currentProjectPath,
    projectMetadata,
  } from "../stores";
  import SortableList from "../sortable/SortableList.svelte";

  // Function to make paths from scene names
  const makeScenePath: (scene: string) => string = getContext("makeScenePath");

  // Map current list of scenes to data for our sortable list
  type SceneItem = { id: string; name: string; path: string };
  let items: SceneItem[];
  $: {
    items = $currentDraft
      ? $currentDraft.scenes.map((s) => ({
          id: s,
          name: s,
          path: makeScenePath(s),
        }))
      : [];
  }

  // Track sort state for styling, set sorting options
  let isSorting = false;
  const sortableOptions: Sortable.Options = {
    animation: 150,
    ghostClass: "scene-ghost",
    onStart: () => {
      isSorting = true;
    },
    onEnd: () => {
      isSorting = false;
    },
  };

  // Called when sorting ends an the item order has been updated.
  // Reorder scenes according and set into the store.
  function itemOrderChanged(event: CustomEvent<SceneItem[]>) {
    const currentDraftIndex = $projectMetadata[
      $currentProjectPath
    ].drafts.findIndex((d) => d.folder === $currentDraftPath);
    $projectMetadata[$currentProjectPath].drafts[currentDraftIndex].scenes =
      event.detail.map((d) => d.name);
  }

  // Grab the click context function and call it when a valid scene is clicked.
  const onSceneClick: (path: string, newLeaf: boolean) => void =
    getContext("onSceneClick");
  function onItemClick(path: string, event: MouseEvent) {
    if (path) {
      onSceneClick(path, event.metaKey);
    }
  }

  // Grab the right-click context function and call it if the right-click
  // happened on a scene element with a valid path.
  const onContextClick: (path: string, x: number, y: number) => void =
    getContext("onContextClick");
  function onContext(event: MouseEvent) {
    const { x, y } = event;
    const element = document.elementFromPoint(x, y);
    const scenePath =
      element && element instanceof HTMLElement && element.dataset.scenePath;
    if (scenePath) {
      onContextClick(scenePath, x, y);
    }
  }
</script>

<div id="scene-list" class:dragging={isSorting}>
  <SortableList
    bind:items
    let:item
    on:orderChanged={itemOrderChanged}
    {sortableOptions}
    class="sortable-scene-list"
  >
    <div
      class="scene-container"
      class:selected={$activeFile && $activeFile.path === item.path}
      on:click={(e) =>
        typeof item.path === "string" ? onItemClick(item.path, e) : {}}
      on:contextmenu|preventDefault={onContext}
      data-scene-path={item.path}
    >
      {item.name}
    </div>
  </SortableList>
</div>

<style>
  #scene-list {
    margin: 4px 0px;
  }

  #scene-list :global(.sortable-scene-list) {
    list-style-type: none;
    padding: 0px;
    margin: 0px;
  }

  .scene-container {
    display: flex;
    border: 1px solid transparent;
    border-radius: 3px;
    cursor: pointer;
    color: var(--text-muted);
    font-size: 14px;
    line-height: 20px;
    white-space: nowrap;
    padding: 2px 0px;
  }

  .selected,
  :not(.dragging) .scene-container:hover {
    background-color: var(--background-secondary-alt);
    color: var(--text-normal);
  }

  .scene-container:active {
    background-color: inherit;
    color: var(--text-muted);
  }

  :global(.scene-ghost) {
    background-color: var(--interactive-accent-hover);
    color: var(--text-on-accent);
  }
</style>
