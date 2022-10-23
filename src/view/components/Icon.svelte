<!--- via https://github.com/joethei/obsidian-rss/blob/master/src/view/IconComponent.svelte -->
<script lang="ts">
  import { setIcon } from "obsidian";

  export let iconName: string = "";

  const icon = (node: HTMLElement, icon: string) => {
    setIcon(node, icon);
  };
</script>

{#if iconName.length > 0}
  <span use:icon={iconName} />
{/if}

<style>
  span {
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
