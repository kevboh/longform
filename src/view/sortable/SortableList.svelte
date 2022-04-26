<script context="module" lang="ts">
  import { toInteger } from "lodash";

  function IndentPlugin() {
    let initialIndent = 0;
    let currentIndent = 0;
    let initialX = 0;
    let dragID: string = null;

    // will probably need to preserve initial indent via dataset and then add/subtract indent delta

    function Indent() {
      this.defaults = {
        indentWidth: 32,
        onIndentChange: () => {},
      };
    }

    Indent.prototype = {
      dragStart(e: any) {
        initialX = e.originalEvent.x;
        initialIndent = toInteger(e.dragEl.dataset["indent"]);
        currentIndent = initialIndent;
        dragID = e.dragEl.dataset["id"];
      },
      dragOver(e: any) {
        const x = e.originalEvent.x - initialX;
        const indentDiff = Math.trunc(x / this.options.indentWidth);
        const newIndent = Math.max(initialIndent + indentDiff, 0);
        if (currentIndent !== newIndent) {
          this.options.onIndentChange(
            dragID,
            e.newIndex || e.oldIndex,
            newIndent,
            this.options.indentWidth
          );
        }
        currentIndent = newIndent;
      },
    };

    return Object.assign(Indent, {
      pluginName: "indent",
      eventProperties() {
        return {
          currentIndent,
        };
      },
    });
  }

  // @ts-ignore
  Sortable.mount(new IndentPlugin());
</script>

<script lang="ts">
  import type SortableType from "sortablejs";
  import Sortable from "sortablejs/modular/sortable.core.esm.js";
  import { createEventDispatcher, onMount } from "svelte";

  // Setup for generic item data structures.
  type Item = $$Generic;
  type T = $$Generic<{
    id: string;
    indent?: number;
    [otherKey: string]: unknown;
  }>;
  interface $$Slots {
    default: {
      item: T;
    };
  }

  // Props
  export let items: T[] = [];
  export let sortableOptions: SortableType.Options = {};
  export let trackIndents = false;

  const dispatcher = createEventDispatcher<{
    orderChanged: T[];
    indentChanged: {
      itemID: string;
      itemIndex: number;
      newIndent: number;
      indentWidth: number;
    };
  }>();

  // Element handles and mount sortable
  let listElement: HTMLElement;
  onMount(() => {
    // Prepare sortable bits. Set up a dispatcher for sort events,
    // and proxy the store.set function to fire it.
    sortableOptions = Object.assign(
      {
        indent: trackIndents,
        onIndentChange: (
          itemID: string,
          itemIndex: number,
          newIndent: number,
          indentWidth: number
        ) => {
          if (trackIndents) {
            dispatcher("indentChanged", {
              itemID,
              itemIndex,
              newIndent,
              indentWidth,
            });
          }
        },
      },
      sortableOptions
    );
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

    Sortable.create(listElement, sortableOptions);
  });
</script>

<ul bind:this={listElement} class={$$props.class}>
  {#each items as item (item.id)}
    <li data-id={item.id} data-indent={item.indent ?? 0}>
      <slot {item} />
    </li>
  {/each}
</ul>

<style>
</style>
