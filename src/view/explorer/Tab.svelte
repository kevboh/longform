<script lang="ts">
  import { type ExplorerTab, selectedTab } from "src/view/stores";

  export let tab: ExplorerTab;
</script>

<button
  class="tab-button"
  class:selected={$selectedTab === tab}
  on:click={() => selectedTab.set(tab)}
>
  {#if tab == "Scenes"}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="clickable-icon lucide lucide-gallery-horizontal-end"
      ><path d="M2 7v10" /><path d="M6 5v14" /><rect
        width="12"
        height="18"
        x="10"
        y="3"
        rx="2"
      /></svg
    >
  {/if}
  {#if tab == "Project"}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="clickable-icon lucide lucide-book-text"
      ><path
        d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"
      /><path d="M8 11h8" /><path d="M8 7h6" /></svg
    >
  {/if}
  {#if tab == "Compile"}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="clickable-icon lucide lucide-blocks"
      ><rect width="7" height="7" x="14" y="3" rx="1" /><path
        d="M10 21V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H3"
      /></svg
    >
  {/if}
  {tab}
</button>

<style>
  .tab-button {
    background: none;
    border: none;
    border-bottom: none;
    border-radius: var(--tab-radius-active);
    padding: 0 1em 0 0.4em;
    box-shadow: none;
    margin: 0;
    color: var(--tab-text-color-focused);
    font-size: var(--tab-font-size);
    font-weight: var(--tab-font-weight);
    white-space: nowrap;
    border-right: 1px solid var(--tab-outline-color);
  }

  .tab-button:hover {
    color: var(--tab-text-color-focused);
    background-color: var(--background-modifier-hover);
  }

  .tab-button.selected {
    background-color: var(--tab-background-active);
    color: var(--tab-text-color-focused-active);
  }
</style>
