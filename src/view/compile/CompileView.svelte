<script lang="ts">
  // @ts-nocheck
  import type Sortable from "sortablejs";
  import { Notice, type Vault } from "obsidian";

  import {
    type CompileStatus,
    CompileStepKind,
    formatStepKind,
    type Workflow,
    PLACEHOLDER_MISSING_STEP,
  } from "src/compile";
  import { getContext } from "svelte";
  import {
    drafts,
    selectedDraft,
    workflows,
    currentWorkflow,
  } from "src/model/stores";
  import CompileStepView from "./CompileStepView.svelte";
  import SortableList from "../sortable/SortableList.svelte";
  import AutoTextArea from "../components/AutoTextArea.svelte";
  import type { Draft } from "src/model/types";

  let workflowContextButton: HTMLElement;
  let workflowInputState: "hidden" | "new" | "rename" = "hidden";
  let workflowInputValue = "";
  let workflowInput: HTMLElement;
  let allWorkflowNames: string[] = [];
  let currentWorkflowName: string | null = null;
  let compileStatus: HTMLElement;
  let defaultCompileStatus: string;
  let isDeletingWorkflow = false;

  const showConfirmModal: (
    title: string,
    description: string,
    yesText: string,
    yesAction: () => void
  ) => void = getContext("showConfirmModal");

  let currentDraftIndex: number;
  $: {
    currentDraftIndex =
      $selectedDraft &&
      $drafts.findIndex((d) => d.vaultPath === $selectedDraft.vaultPath);
  }

  // WORKFLOW MANAGEMENT

  $: allWorkflowNames = Object.keys($workflows).sort() ?? [];

  $: {
    if ($selectedDraft) {
      currentWorkflowName = $selectedDraft.workflow;

      if (
        !isDeletingWorkflow &&
        $selectedDraft &&
        !currentWorkflowName &&
        allWorkflowNames.length > 0
      ) {
        // shadowed here to prevent circular reference
        const _currentDraftIndex = $drafts.findIndex(
          (d) => d.vaultPath === $selectedDraft.vaultPath
        );
        $drafts[_currentDraftIndex].workflow = allWorkflowNames[0];
      }
    }
  }

  function selectedWorkflow(event: Event) {
    // @ts-ignore
    const title = event.target.value;
    $drafts[currentDraftIndex].workflow = title;
  }

  const showCompileActionsMenu: (
    x: number,
    y: number,
    currentWorkflowName: string,
    action: (type: "new" | "rename" | "delete") => void
  ) => void = getContext("showCompileActionsMenu");

  function workflowAction(type: "new" | "rename" | "delete") {
    if (type == "new") {
      workflowInputState = "new";
    } else if (type == "rename") {
      workflowInputValue = currentWorkflowName;
      workflowInputState = "rename";
    } else if (type == "delete") {
      showConfirmModal(
        `Delete ${currentWorkflowName}?`,
        "Really delete this workflow? This can’t be undone.",
        "Delete",
        () => {
          isDeletingWorkflow = true;

          const toDelete = currentWorkflowName;
          const remaining = allWorkflowNames.filter((n) => n != toDelete);
          if (remaining.length > 0) {
            $drafts[currentDraftIndex].workflow = remaining[0];
          } else {
            $drafts[currentDraftIndex].workflow = null;
          }

          $workflows = delete $workflows[toDelete] && $workflows;

          isDeletingWorkflow = false;
        }
      );
    }
  }

  function onWorkflowInputEnter() {
    if (workflowInputValue.length == 0) {
      return;
    }

    if (workflowInputState == "new") {
      $workflows[workflowInputValue] = {
        name: workflowInputValue,
        description: "",
        steps: [],
      };
    } else if (workflowInputState == "rename") {
      const workflow = $workflows[currentWorkflowName];
      workflow.name = workflowInputValue;
      $workflows[workflowInputValue] = workflow;
      $workflows = delete $workflows[currentWorkflowName] && $workflows;
    }
    $drafts[currentDraftIndex].workflow = workflowInputValue;
    workflowInputValue = "";
    workflowInputState = "hidden";
  }

  function focusOnInit(el: HTMLElement) {
    el.focus();
  }

  // VALIDATION

  const openCompileStepMenu: () => Vault = getContext("openCompileStepMenu");
  function addStep() {
    openCompileStepMenu();
  }

  enum WorkflowError {
    Valid = "",
    BadFirstStep = "The first step must be of Scene or Join type; compilation begins with all scenes as input.",
    MissingJoinStep = "A Manuscript step must occur after a Join step; Manuscript steps run on a single file, not all scenes.",
    ScenesStepPostJoin = "A Scene or Join step cannot occur after a Join step; at this point in the workflow, steps must operate on a single file.",
    UnloadedStep = "This workflow contains a step that could not be loaded. Please delete or replace it.",
    JoinForSingle = "Single-scene projects do not support Join steps.",
  }

  type WorkflowValidationResult = {
    error: WorkflowError;
    stepPosition: number;
  };

  function calculateWorkflow(
    workflow: Workflow,
    isMultiScene: boolean
  ): [WorkflowValidationResult, CompileStepKind[]] {
    if (!workflow) {
      return;
    }

    let currentKind = null;
    let calculatedKinds: CompileStepKind[] = [];
    for (
      let stepPosition = 0;
      stepPosition < workflow.steps.length;
      stepPosition++
    ) {
      const step = workflow.steps[stepPosition];
      const kinds = step.description.availableKinds;

      const hasSceneKind = kinds.includes(CompileStepKind.Scene);
      const hasJoinKind = kinds.includes(CompileStepKind.Join);
      const hasManuscriptKind = kinds.includes(CompileStepKind.Manuscript);

      if (
        step.description.canonicalID ===
        PLACEHOLDER_MISSING_STEP.description.canonicalID
      ) {
        return [
          {
            error: WorkflowError.UnloadedStep,
            stepPosition,
          },
          calculatedKinds,
        ];
      }

      if (!isMultiScene) {
        if (hasSceneKind) {
          currentKind = CompileStepKind.Scene;
        } else if (hasManuscriptKind) {
          currentKind = CompileStepKind.Manuscript;
        } else {
          return [
            {
              error: WorkflowError.JoinForSingle,
              stepPosition,
            },
            calculatedKinds,
          ];
        }
      } else {
        // Calculate the next step kind
        if (!currentKind) {
          // First step calculation
          if (hasJoinKind) {
            currentKind = CompileStepKind.Join;
          } else if (hasSceneKind) {
            currentKind = CompileStepKind.Scene;
          } else {
            return [
              {
                error: WorkflowError.BadFirstStep,
                stepPosition,
              },
              calculatedKinds,
            ];
          }
        } else {
          // Subsequent step calculations
          if (!calculatedKinds.includes(CompileStepKind.Join)) {
            // We're pre-join, all kinds must be scene or join
            if (hasJoinKind) {
              currentKind = CompileStepKind.Join;
            } else if (hasSceneKind) {
              currentKind = CompileStepKind.Scene;
            } else {
              return [
                {
                  error: WorkflowError.MissingJoinStep,
                  stepPosition,
                },
                calculatedKinds,
              ];
            }
          } else {
            // We're post-join, all kinds must be of type manuscript
            if (kinds.includes(CompileStepKind.Manuscript)) {
              currentKind = CompileStepKind.Manuscript;
            } else {
              return [
                {
                  error: WorkflowError.ScenesStepPostJoin,
                  stepPosition,
                },
                calculatedKinds,
              ];
            }
          }
        }
      }

      calculatedKinds.push(currentKind);
    }

    return [
      {
        error: WorkflowError.Valid,
        stepPosition: 0,
      },
      calculatedKinds,
    ];
  }

  const VALID = {
    error: WorkflowError.Valid,
    stepPosition: 0,
  };
  let validation: WorkflowValidationResult = VALID;
  let calculatedKinds: CompileStepKind[] = [];
  $: {
    if ($currentWorkflow) {
      [validation, calculatedKinds] = calculateWorkflow(
        $currentWorkflow,
        $selectedDraft.format === "scenes"
      );
    } else {
      validation = VALID;
      calculatedKinds = [];
    }
  }

  function kindAtIndex(index: number): CompileStepKind | null {
    return index < calculatedKinds.length ? calculatedKinds[index] : null;
  }

  function errorAtIndex(index: number): string | null {
    if (
      validation.error !== WorkflowError.Valid &&
      validation.stepPosition === index
    ) {
      return validation.error;
    }
    return null;
  }

  // SORTING
  type StepItem = { id: string; index: number };
  let items: StepItem[];
  $: {
    items = $currentWorkflow
      ? $currentWorkflow.steps.map((step, index) => ({
          id: step.id,
          index,
        }))
      : [];
  }

  const sortableOptions: Sortable.Options = {
    animation: 150,
    ghostClass: "step-ghost",
    dragClass: "step-drag",
  };

  // Called when sorting ends an the item order has been updated.
  function itemOrderChanged(event: CustomEvent<StepItem[]>) {
    const newWorkflow = {
      ...$currentWorkflow,
      steps: event.detail.map(({ index }) => $currentWorkflow.steps[index]),
    };
    $workflows[currentWorkflowName] = newWorkflow;
  }

  // COMPILATION

  $: defaultCompileStatus = `Will run ${
    $currentWorkflow ? $currentWorkflow.steps.length : 0
  } steps.`;

  function onCompileStatusChange(status: CompileStatus) {
    if (status.kind == "CompileStatusError") {
      compileStatus.innerText = `${status.error}. See dev console for more details.`;
      compileStatus.classList.add("compile-status-error");
      restoreDefaultStatusAfter(10000);
    } else if (status.kind == "CompileStatusStep") {
      compileStatus.innerText = `Step ${status.stepIndex + 1}/${
        status.totalSteps
      } (${formatStepKind(status.stepKind)})`;
    } else if (status.kind == "CompileStatusSuccess") {
      compileStatus.innerText = "Compiled manuscript.";
      compileStatus.classList.add("compile-status-success");
      restoreDefaultStatusAfter();
      new Notice("Compile complete.");
    } else {
      compileStatus.innerText = "default??";
    }
  }

  function restoreDefaultStatusAfter(ms: number = 3000) {
    setTimeout(() => {
      compileStatus.innerText = defaultCompileStatus;
      compileStatus.classList.remove("compile-status-error");
      compileStatus.classList.remove("compile-status-success");
    }, ms);
  }

  const compile: (
    draft: Draft,
    workflow: Workflow,
    kinds: CompileStepKind[],
    statusCallback: (status: CompileStatus) => void
  ) => Vault = getContext("compile");
  function doCompile() {
    compile(
      $selectedDraft,
      $currentWorkflow,
      calculatedKinds,
      onCompileStatusChange
    );
  }
</script>

{#if $selectedDraft}
  <div class="longform-compile-container">
    <div class="longform-workflow-picker-container">
      <div class="longform-workflow-picker">
        {#if workflowInputState !== "hidden"}
          <input
            type="text"
            placeholder={workflowInputState == "new"
              ? "New Workflow…"
              : "My Cool Workflow"}
            bind:value={workflowInputValue}
            bind:this={workflowInput}
            on:keydown={(e) => {
              if (e.key === "Enter" && workflowInputValue.length > 0) {
                onWorkflowInputEnter();
              } else if (e.key === "Escape") {
                workflowInputValue = "";
                workflowInput.blur();
                workflowInputState = "hidden";
              }
            }}
            use:focusOnInit
          />
        {:else}
          {#if allWorkflowNames.length == 0}
            <span class="longform-hint">Create a new workflow to begin →</span>
          {:else}
            <div class="select">
              <select
                id="longform-workflows"
                value={$selectedDraft.workflow}
                on:change={selectedWorkflow}
              >
                {#each allWorkflowNames as workflowOption}
                  <option value={workflowOption}>{workflowOption}</option>
                {/each}
              </select>
            </div>
          {/if}
          <button
            class="options-button"
            title="Workflow Actions"
            bind:this={workflowContextButton}
            on:click={() => {
              const rect = workflowContextButton.getBoundingClientRect();
              showCompileActionsMenu(
                rect.x,
                rect.y,
                currentWorkflowName,
                workflowAction
              );
            }}>▼</button
          >
        {/if}
      </div>
      {#if $workflows[currentWorkflowName]}
        <AutoTextArea
          placeholder="Click here to leave a description of your workflow…"
          minRows={2}
          maxRows={5}
          bind:value={$workflows[currentWorkflowName].description}
        />
      {/if}
    </div>
    {#if $workflows[currentWorkflowName]}
      <SortableList
        bind:items
        let:item
        {sortableOptions}
        on:orderChanged={itemOrderChanged}
        class="longform-sortable-step-list"
      >
        <CompileStepView
          ordinal={item.index + 1}
          bind:step={$workflows[currentWorkflowName].steps[item.index]}
          on:removeStep={() => {
            const newWorkflow = {
              ...$currentWorkflow,
              steps: $currentWorkflow.steps.filter(
                (_e, index) => item.index !== index
              ),
            };
            $workflows[currentWorkflowName] = newWorkflow;
          }}
          calculatedKind={kindAtIndex(item.index)}
          error={errorAtIndex(item.index)}
        />
      </SortableList>
      <div class="add-step-container">
        {#if Object.keys($workflows).length > 0}
          <button on:click={addStep}>+ Add Step</button>
        {/if}
      </div>
    {/if}

    <p>
      Compile workflows run their steps in order.<br /><b>Scene</b> workflows
      run once per scene.<br /><b>Join</b> workflows run once and combine the
      rest of your scene steps into a single manuscript.<br /><b>Manuscript</b>
      steps run once on the joined manuscript.<br />Drag to rearrange.
      <a href="https://github.com/kevboh/longform/blob/main/docs/COMPILE.md"
        >Documentation here.</a
      >
    </p>

    <div class="longform-compile-run-container">
      {#if $currentWorkflow && $currentWorkflow.steps.length > 0}
        <button
          class="compile-button"
          on:click={doCompile}
          disabled={validation.error !== WorkflowError.Valid}
          aria-label={validation.error}>Compile</button
        >
        <span class="compile-status" bind:this={compileStatus}
          >{validation.error === WorkflowError.Valid
            ? defaultCompileStatus
            : validation.error}</span
        >
      {/if}
    </div>
  </div>
{/if}

<style>
  .longform-workflow-picker-container {
    margin-bottom: 2rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--background-modifier-border);
    display: flex;
    flex-direction: column;
  }

  .longform-workflow-picker {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: 0.5rem;
  }

  .longform-workflow-picker .longform-hint {
    font-size: 1rem;
  }

  select {
    background-color: transparent;
    border: none;
    padding: 5px 0;
    margin: 0;
    font-family: inherit;
    font-size: inherit;
    cursor: inherit;
    line-height: inherit;
    outline: none;
  }

  .select {
    cursor: pointer;
  }

  .select > select {
    color: var(--text-accent);
  }

  .select > select:hover {
    text-decoration: underline;
    color: var(--text-accent-hover);
  }

  .longform-compile-container :global(.longform-sortable-step-list) {
    list-style-type: none;
    padding: 0px;
    margin: 0px;
  }

  .options-button {
    background-color: var(--background-secondary-alt);
    color: var(--text-accent);
  }

  .options-button:hover {
    background-color: var(--background-primary);
    color: var(--text-accent-hover);
  }

  .add-step-container {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
  }

  .add-step-container button {
    font-weight: bold;
    color: var(--text-accent);
  }

  .add-step-container button:hover {
    text-decoration: underline;
    color: var(--text-accent-hover);
  }

  .compile-button {
    font-weight: bold;
    background-color: var(--interactive-accent);
    color: var(--text-on-accent);
  }

  .compile-button:hover {
    background-color: var(--interactive-accent-hover);
    color: var(--text-on-accent);
  }

  .compile-button:disabled {
    background-color: var(--text-muted);
    color: var(--text-faint);
  }

  .longform-compile-run-container {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    margin-top: 2rem;
  }

  .longform-compile-run-container .compile-status {
    color: var(--text-muted);
  }

  :global(.compile-status-error) {
    color: var(--text-error) !important;
  }

  :global(.compile-status-success) {
    color: var(--interactive-success) !important;
  }

  :global(.step-ghost) {
    background-color: var(--interactive-accent-hover);
    color: var(--text-on-accent);
  }
</style>
