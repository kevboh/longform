<script lang="ts">
  /* Note: VSCode doesn't love the use of generics + let:item
     in the html section here. I'm not sure what to do about it;
     it's valid svelte and doesn't typeerror on compile.
  */
  import type Sortable from "sortablejs";
  import { getContext } from "svelte";

  import { activeFile } from "../stores";

  import { drafts, selectedDraft } from "src/model/stores";

  import SortableList from "../sortable/SortableList.svelte";
  import type { IndentedScene, MultipleSceneDraft } from "src/model/types";
  import Disclosure from "../components/Disclosure.svelte";

  let currentDraftIndex: number;
  $: {
    currentDraftIndex = $drafts.findIndex(
      (d) => d.vaultPath === $selectedDraft.vaultPath
    );
  }

  // Function to make paths from scene names
  const makeScenePath: (draft: MultipleSceneDraft, scene: string) => string =
    getContext("makeScenePath");

  // Map current list of scenes to data for our sortable list
  type SceneItem = {
    id: string;
    name: string;
    path: string;
    indent: number;
    collapsible: boolean;
  };
  let items: SceneItem[];
  $: {
    items =
      $selectedDraft && $selectedDraft.format === "scenes"
        ? itemsFromScenes($selectedDraft.scenes, collapsedItems)
        : [];
  }

  // INDENTATION & COLLAPSING
  let ghostIndent = 0;
  let draggingIndent = 0;
  let draggingID: string = null;
  let collapsedItems: string[] = [];

  function itemsFromScenes(
    scenes: IndentedScene[],
    _collapsedItems: string[]
  ): SceneItem[] {
    const itemsToReturn: SceneItem[] = [];
    let ignoringUntilIndent = Infinity;

    scenes.forEach(({ title, indent }, index) => {
      if (indent <= ignoringUntilIndent) {
        ignoringUntilIndent = Infinity;

        const collapsed = _collapsedItems.contains(title);
        if (collapsed) {
          ignoringUntilIndent = indent;
        }

        const nextScene = index < scenes.length - 1 ? scenes[index + 1] : false;
        const item = {
          id: title,
          name: title,
          indent: indent,
          path: makeScenePath($selectedDraft as MultipleSceneDraft, title),
          collapsible: nextScene && nextScene.indent > indent,
        };
        itemsToReturn.push(item);
      }
    });

    return itemsToReturn;
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

  function itemOrderChanged(event: CustomEvent<SceneItem[]>) {
    if (currentDraftIndex >= 0 && $selectedDraft.format === "scenes") {
      const scenes = event.detail.map((d) => ({
        title: d.name,
        indent: d.name === draggingID ? draggingIndent : d.indent,
      }));
      ($drafts[currentDraftIndex] as MultipleSceneDraft).scenes = scenes;

      if ($activeFile) {
        onSceneClick($activeFile.path, false);
      }
    }
  }

  function itemIndentChanged(
    event: CustomEvent<{
      itemID: string;
      itemIndex: number;
      newIndent: number;
      indentWidth: number;
    }>
  ) {
    draggingID = event.detail.itemID;
    draggingIndent = event.detail.newIndent;
    ghostIndent = draggingIndent * event.detail.indentWidth;
  }

  // Grab the click context function and call it when a valid scene is clicked.
  const onSceneClick: (path: string, newLeaf: boolean) => void =
    getContext("onSceneClick");
  function onItemClick(item: any, event: MouseEvent) {
    const sceneItem = item as SceneItem;
    if (sceneItem.path) {
      if (sceneItem.collapsible && sceneItem.path === $activeFile.path) {
        if (!collapsedItems.contains(sceneItem.id)) {
          collapsedItems = [...collapsedItems, sceneItem.id];
        } else {
          collapsedItems = collapsedItems.filter((i) => i !== sceneItem.id);
        }
      } else {
        onSceneClick(sceneItem.path, event.metaKey);
      }
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

  function doWithUnknown(fileName: string, action: "add" | "ignore") {
    const currentDraftIndex = $drafts.findIndex(
      (d) => d.vaultPath === $selectedDraft.vaultPath
    );
    if (currentDraftIndex >= 0 && $selectedDraft.format === "scenes") {
      drafts.update((d) => {
        const targetDraft = d[currentDraftIndex] as MultipleSceneDraft;
        if (action === "add") {
          (d[currentDraftIndex] as MultipleSceneDraft).scenes = [
            ...targetDraft.scenes,
            { title: fileName, indent: 0 },
          ];
        } else {
          (d[currentDraftIndex] as MultipleSceneDraft).ignoredFiles = [
            ...targetDraft.ignoredFiles,
            fileName,
          ];
        }
        (d[currentDraftIndex] as MultipleSceneDraft).unknownFiles =
          targetDraft.unknownFiles.filter((f) => f !== fileName);
        return d;
      });
    }
  }
</script>

<div>
  <div
    id="scene-list"
    class:dragging={isSorting}
    style="--ghost-indent: {ghostIndent}px"
  >
    <SortableList
      trackIndents
      bind:items
      let:item
      on:orderChanged={itemOrderChanged}
      on:indentChanged={itemIndentChanged}
      {sortableOptions}
      class="sortable-scene-list"
    >
      <div
        class="scene-container"
        style="margin-left: {item.indent * 32}px"
        class:selected={$activeFile && $activeFile.path === item.path}
        on:click={(e) =>
          typeof item.path === "string" ? onItemClick(item, e) : {}}
        on:contextmenu|preventDefault={onContext}
        data-scene-path={item.path}
        data-scene-indent={item.indent}
      >
        {#if item.collapsible}
          <Disclosure collapsed={collapsedItems.contains(item.id)} />
        {/if}
        <span style="pointer-events: none;">{item.name}</span>
      </div>
    </SortableList>
  </div>
  {#if $selectedDraft.format === "scenes" && $selectedDraft.unknownFiles.length > 0}
    <div id="longform-unknown-files-wizard">
      <div class="longform-unknown-inner">
        <p class="longform-unknown-explanation">
          Longform has found {$selectedDraft.unknownFiles.length} new file{$selectedDraft
            .unknownFiles.length === 1
            ? ""
            : "s"} in your scenes folder.
        </p>
        <ul>
          {#each $selectedDraft.unknownFiles as fileName}
            <li>
              <div class="longform-unknown-file">
                <span>{fileName}</span>
                <div>
                  <button
                    class="longform-unknown-add"
                    on:click={() => doWithUnknown(fileName, "add")}>Add</button
                  >
                  <button
                    class="longform-unknown-ignore"
                    on:click={() => doWithUnknown(fileName, "ignore")}
                    >Ignore</button
                  >
                </div>
              </div>
            </li>
          {/each}
        </ul>
      </div>
    </div>
  {/if}
</div>

<style>
  :global(.group) {
    margin-left: 8px;
  }

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
    flex-direction: row;
    align-items: center;
    border: 1px solid transparent;
    border-radius: 3px;
    cursor: pointer;
    color: var(--text-muted);
    font-size: 14px;
    line-height: 20px;
    white-space: nowrap;
    padding: 2px 0px;
  }

  .scene-container *:nth-child(2) {
    margin-left: 8px;
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

  #longform-unknown-files-wizard {
    border-top: 1px solid var(--text-muted);
    padding: 8px 0px;
  }

  .longform-unknown-inner {
    border-left: 2px solid var(--text-accent);
    padding: 0px 0px 0px 4px;
  }

  .longform-unknown-explanation {
    color: var(--text-muted);
    font-size: 1rem;
  }

  #longform-unknown-files-wizard ul {
    list-style-type: none;
    padding: 0px 0px 0px 8px;
  }

  .longform-unknown-file {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }

  .longform-unknown-add {
    color: var(--text-accent);
    font-weight: bold;
  }

  .longform-unknown-ignore {
    color: var(--text-muted);
    font-weight: bold;
  }

  :global(.scene-ghost) {
    background-color: var(--interactive-accent-hover);
    color: var(--text-on-accent);
    margin-left: var(--ghost-indent);
  }
</style>
