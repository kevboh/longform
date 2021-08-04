<script lang="ts">
  /* Note: VSCode doesn't love the use of generics + let:item
     in the html section here. I'm not sure what to do about it;
     it's valid svelte and doesn't typeerror on compile.
  */
  import type Sortable from "sortablejs";
  import { getContext } from "svelte";

  import {
    currentProject,
    currentDraftPath,
    currentProjectPath,
    projectMetadata,
  } from "../stores";
  import SortableList from "../sortable/SortableList.svelte";

  // Map current list of scenes to data for our sortable list
  type DraftItem = { id: string; name: string };
  let items: DraftItem[];
  $: {
    items = $currentProject
      ? $currentProject.drafts.map((d) => ({
          id: d.folder,
          name: d.name,
        }))
      : [];
  }

  // Track sort state for styling, set sorting options
  let isSorting = false;
  const sortableOptions: Sortable.Options = {
    animation: 150,
    ghostClass: "draft-ghost",
    onStart: () => {
      isSorting = true;
    },
    onEnd: () => {
      isSorting = false;
    },
  };

  // Called when sorting ends an the item order has been updated.
  // Reorder scenes according and set into the store.
  function itemOrderChanged(event: CustomEvent<DraftItem[]>) {
    // Reorder metadata accounts to this new order
    const reorderedDrafts = [...$currentProject.drafts].sort((a, b) => {
      const aIndex = event.detail.findIndex((d) => d.id === a.folder);
      const bIndex = event.detail.findIndex((d) => d.id === b.folder);

      return aIndex - bIndex;
    });

    $projectMetadata[$currentProjectPath].drafts = reorderedDrafts;
  }

  function onItemClick(path: string) {
    if (path) {
      $currentDraftPath = path;
    }
  }

  let editingPath: string | null = null;

  function selectElementContents(el: HTMLElement) {
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  const showRenameDraftMenu: (
    x: number,
    y: number,
    action: () => void
  ) => void = getContext("showRenameDraftMenu");
  function onContext(event: MouseEvent) {
    const { x, y } = event;
    const element = document.elementFromPoint(x, y);
    showRenameDraftMenu(x, y, () => {
      if (element && element instanceof HTMLElement) {
        const draftPath = element.dataset.draftPath;
        editingPath = draftPath;
        setTimeout(() => selectElementContents(element), 0);
      }
    });
  }

  const renameFolder: (oldPath: string, newPath: string) => void =
    getContext("renameFolder");
  const makeDraftPath: (name: string) => string = getContext("makeDraftPath");
  function onKeydown(event: KeyboardEvent) {
    if (editingPath && event.target instanceof HTMLElement) {
      if (event.key === "Enter") {
        const oldPath = makeDraftPath(editingPath);
        const newPath = makeDraftPath(event.target.innerText);
        renameFolder(oldPath, newPath);
        editingPath = null;
        return false;
      } else if (event.key === "Escape") {
        event.target.blur();
        return false;
      }
    }
    return true;
  }

  function onBlur(event: FocusEvent) {
    if (event.target instanceof HTMLElement) {
      event.target.innerText = editingPath;
    }
    editingPath = null;
  }
</script>

<div id="draft-list" class:dragging={isSorting}>
  <SortableList
    bind:items
    let:item
    on:orderChanged={itemOrderChanged}
    {sortableOptions}
    class="sortable-draft-list"
  >
    <div
      class="draft-container"
      class:selected={$currentDraftPath && $currentDraftPath === item.id}
      on:click={() => onItemClick(item.id)}
      on:contextmenu|preventDefault={onContext}
      on:keydown={item.id === editingPath ? onKeydown : null}
      on:blur={item.id === editingPath ? onBlur : null}
      data-draft-path={item.id}
      contenteditable={item.id === editingPath}
    >
      {item.name}
    </div>
  </SortableList>
</div>

<style>
  #draft-list {
    margin: 4px 0px;
  }

  #draft-list :global(.sortable-draft-list) {
    list-style-type: none;
    padding: 0px;
    margin: 0px;
  }

  .draft-container {
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
  :not(.dragging) .draft-container:hover {
    background-color: var(--background-secondary-alt);
    color: var(--text-normal);
  }

  .draft-container:active {
    background-color: inherit;
    color: var(--text-muted);
  }

  :global(.draft-ghost) {
    background-color: var(--interactive-accent-hover);
    color: var(--text-on-accent);
  }
</style>
