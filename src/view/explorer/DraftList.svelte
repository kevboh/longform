<script lang="ts">
  import { getContext } from "svelte";

  import {
    drafts,
    selectedProject,
    selectedDraft,
    selectedDraftVaultPath,
  } from "src/model/stores";
  import { draftTitle } from "src/model/draft-utils";
  import type { Draft } from "src/model/types";

  function onDraftClick(draft: Draft) {
    $selectedDraftVaultPath = draft.vaultPath;
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

  // TODO: aliases
  // const renameFolder: (oldPath: string, newPath: string) => void =
  //   getContext("renameFolder");
  // const makeDraftPath: (name: string) => string = getContext("makeDraftPath");
  function onKeydown(event: KeyboardEvent) {
    if (editingPath && event.target instanceof HTMLElement) {
      if (event.key === "Enter") {
        const currentDraftIndex = $drafts.findIndex(
          (d) => d.vaultPath === editingPath
        );
        const d = $drafts[currentDraftIndex];
        $drafts[currentDraftIndex] = {
          ...d,
          draftTitle: event.target.innerText,
        };
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

<div id="draft-list">
  {#if $selectedProject}
    <ol>
      {#each $selectedProject as draft}
        <li>
          <div
            class="draft-container"
            class:selected={$selectedDraft &&
              $selectedDraft.vaultPath === draft.vaultPath}
            on:click={() => onDraftClick(draft)}
            on:contextmenu|preventDefault={onContext}
            on:keydown={draft.vaultPath === editingPath ? onKeydown : null}
            on:blur={draft.vaultPath === editingPath ? onBlur : null}
            data-draft-path={draft.vaultPath}
            contenteditable={draft.vaultPath === editingPath}
          >
            {draftTitle(draft)}
          </div>
        </li>
      {/each}
    </ol>
  {/if}
</div>

<style>
  #draft-list {
    margin: 4px 0px;
  }

  #draft-list ol {
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
  .draft-container:hover {
    background-color: var(--background-secondary-alt);
    color: var(--text-normal);
  }

  .draft-container:active {
    background-color: inherit;
    color: var(--text-muted);
  }
</style>
