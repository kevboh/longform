<script lang="ts">
  import { type ExplorerTab, selectedTab } from "src/view/stores";

  export let tab: ExplorerTab;
</script>

<button
  class="tab-button"
  class:selected={$selectedTab === tab}
  on:click={() => selectedTab.set(tab)}
>
  {tab}
</button>

<style>
  .tab-button {
    background: none;
    border: none;
    border-bottom: none;
    border-radius: 0;
    margin: 0;
    color: var(--interactive-accent);
  }

  .tab-button.selected {
    border-bottom: 2px solid var(--text-muted);
    color: var(--text-accent);
  }
</style>
