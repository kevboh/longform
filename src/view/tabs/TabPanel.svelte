<script>
  import { getContext } from "svelte";

  const panel = {};
  const { registerPanel, selectedPanel } = getContext("tabs");

  registerPanel(panel);
</script>

{#if $selectedPanel === panel}
  <div class="tab-panel-container">
    <slot />
  </div>
{/if}

<style>
  .tab-panel-container {
    padding: 0 8px;
  }
</style>
