<script lang="ts">
  import type SortableType from "sortablejs";
  import Sortable from "sortablejs/modular/sortable.core.esm.js";
  import { createEventDispatcher, onMount } from "svelte";

  // Setup for generic item data structures.
  type Item = $$Generic;
  type T = $$Generic<{ id: string; [otherKey: string]: unknown }>;
  interface $$Slots {
    default: {
      item: T;
    };
  }

  // Props
  export let items: T[] = [];
  export let sortableOptions: SortableType.Options = {};

  // Prepare sortable bits. Set up a dispatcher for sort events,
  // and proxy the store.set function to fire it.
  const dispatcher = createEventDispatcher<{ orderChanged: T[] }>();
  sortableOptions = Object.assign({}, sortableOptions);
  sortableOptions.store = sortableOptions.store || {
    set: () => {},
    get: (sortable: SortableType) => sortable.toArray(),
  };
  const oldStoreSet = sortableOptions.store.set;
  sortableOptions.store.set = (sortable: SortableType) => {
    const sortedItems = sortable
      .toArray()
      .map((k) => items.find((i) => i.id === k));
    dispatcher("orderChanged", sortedItems);
    oldStoreSet(sortable);
  };

  // Element handles and mount sortable
  // @ts-ignore
  let sortable: SortableType;
  let listElement: HTMLElement;
  onMount(() => {
    sortable = Sortable.create(listElement, sortableOptions);
  });
</script>

<ul bind:this={listElement} class={$$props.class}>
  {#each items as item (item.id)}
    <li data-id={item.id}>
      <slot {item} />
    </li>
  {/each}
</ul>

<style>
</style>
