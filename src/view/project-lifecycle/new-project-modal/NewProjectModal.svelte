<script lang="ts">
  import { normalizePath, type TFolder } from "obsidian";
  import { getContext } from "svelte";

  export let parent: TFolder;
  let type: "scenes" | "single" = "scenes";

  let title: string;
  let valid = false;
  let draftPath: string;
  const regex = /[:\\\/]/;
  $: {
    valid = title && !regex.test(title);
    if (valid) {
      if (type === "scenes") {
        draftPath = normalizePath(`${parent.path}/${title}/Index.md`);
      } else {
        draftPath = normalizePath(`${parent.path}/${title}.md`);
      }
    }
  }

  const createProject: (
    format: "scenes" | "single",
    title: string,
    path: string
  ) => Promise<void> = getContext("createProject");
  function onCreateProject() {
    createProject(type, title, draftPath);
  }
</script>

<div>
  <div class="switch-container">
    <button
      type="button"
      class:selected={type === "scenes"}
      on:click={() => {
        type = "scenes";
      }}>Multi</button
    >
    <button
      type="button"
      class:selected={type === "single"}
      on:click={() => {
        type = "single";
      }}>Single</button
    >
  </div>
  <div>
    {#if type === "scenes"}
      <p>
        A <i>multi-scene project</i> is comprised of many ordered notes, called “scenes,”
        that you can combine together into your manuscript. It also includes an index
        file, the YAML frontmatter of which is used by Longform to track your project.
      </p>
      <p>
        Because this project type involves multiple notes, Longform will create
        an enclosing folder for your project and its scenes. You can always
        rename the folder, the index file, or both.
      </p>
    {:else}
      <p>
        A <i>single-scene project</i> is a single note, perhaps a short story or
        essay, that includes its own YAML frontmatter which is used by Longform to
        track your project.
      </p>
    {/if}
  </div>
  <div>
    <label for="longform-new-project-title">Title</label>
    <input
      id="longform-new-project-title"
      type="text"
      placeholder="My Project Title"
      bind:value={title}
      on:keydown={(e) => {
        if (e.key === "Enter") {
          onCreateProject();
        }
      }}
    />
  </div>
  <div>
    {#if valid}
      <p class="create-project-prompt">
        You are creating a <b
          >{type === "scenes" ? "multi-scene" : "single-scene"} project</b
        >
        at
        <span class="target-path">{draftPath}</span>
      </p>
      <div class="project-creation-container">
        <button type="button" on:click={onCreateProject}>Create</button>
      </div>
    {/if}
  </div>
</div>

<style>
  .switch-container {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
  }

  .switch-container button {
    margin: 0;
    font-weight: bold;
  }

  .switch-container button:first-child {
    border-radius: 3px 0 0 3px;
  }

  .switch-container button:last-child {
    border-radius: 0 3px 3px 0;
  }

  .switch-container button.selected {
    background-color: var(--interactive-accent);
    color: var(--text-on-accent);
  }

  .target-path {
    color: var(--text-accent);
  }

  label {
    font-weight: bold;
    color: var(--text-muted);
    display: block;
    font-size: 0.8rem;
  }

  input[type="text"] {
    width: 100%;
    font-size: 1.5rem;
    height: 3rem;
    padding: 8px;
  }

  .project-creation-container {
    display: flex;
    flex-direction: row;
    justify-content: end;
  }

  .project-creation-container button {
    font-weight: bold;
    background-color: var(--interactive-accent);
    color: var(--text-on-accent);
    margin: 0;
  }
</style>
