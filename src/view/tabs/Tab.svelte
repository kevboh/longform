<script>
  import { getContext } from "svelte";

  const tab = {};
  const { registerTab, selectTab, selectedTab } = getContext("tabs");

  registerTab(tab);
</script>

<button class:selected={$selectedTab === tab} on:click={() => selectTab(tab)}>
  <slot />
</button>

<style>
  button {
    background: none;
    border: none;
    border-bottom: none;
    border-radius: 0;
    margin: 0;
    color: var(--interactive-accent);
  }

  .selected {
    border-bottom: 2px solid var(--text-muted);
    color: var(--text-accent);
  }
</style>
