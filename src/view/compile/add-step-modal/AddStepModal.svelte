<script lang="ts">
  import {
    selectedDraft,
    workflows,
    currentWorkflow,
    userScriptSteps,
  } from "src/model/stores";
  import { getContext } from "svelte";

  import { BUILTIN_STEPS } from "../../../compile/steps";
  import type {
    CompileStep,
    Workflow,
  } from "../../../compile/steps/abstract-compile-step";
  import {
    explainStepKind,
    formatStepKind,
  } from "../../../compile/steps/abstract-compile-step";

  const close: () => void = getContext("close");
  function onStepClick(step: CompileStep) {
    // Inject the current epoch into the step ID to allow
    // multiple same-typed steps.
    const newWorkflow: Workflow = {
      ...$currentWorkflow,
      steps: [
        ...($currentWorkflow as Workflow).steps,
        { ...step, id: `${step.id}-${Date.now()}` },
      ],
    } as Workflow;
    const currentWorkflowName = $selectedDraft.workflow;
    $workflows[currentWorkflowName] = newWorkflow;
    close();
  }
</script>

<div class="longform-add-step-modal-contents">
  <p>
    Choose a step from the following options to add to your current compile
    workflow.
  </p>

  <h2>Built-in Steps</h2>
  <div class="longform-steps-grid">
    {#each BUILTIN_STEPS as step}
      <div class="longform-compile-step" on:click={() => onStepClick(step)}>
        <h3>{step.description.name}</h3>
        <div class="longform-step-pill-container">
          {#each step.description.availableKinds as kind}
            <span class="longform-step-kind-pill" title={explainStepKind(kind)}
              >{formatStepKind(kind)}</span
            >
          {/each}
          <p>{step.description.description}</p>
        </div>
      </div>
    {/each}
  </div>
  {#if $userScriptSteps}
    <h2>User Script Steps</h2>
    <div class="longform-steps-grid">
      {#each $userScriptSteps as step}
        <div class="longform-compile-step" on:click={() => onStepClick(step)}>
          <h3>{step.description.name}</h3>
          <div class="longform-step-pill-container">
            {#each step.description.availableKinds as kind}
              <span
                class="longform-step-kind-pill"
                title={explainStepKind(kind)}>{formatStepKind(kind)}</span
              >
            {/each}
            <p>{step.description.description}</p>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .longform-steps-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--size-4-4);
    grid-auto-rows: auto;
  }

  .longform-compile-step {
    cursor: pointer;
    grid-column: auto;
    grid-row: auto;
    background-color: var(--background-secondary);
    border: var(--size-2-1) solid var(--background-modifier-border);
    border-radius: var(--size-4-4);
    padding: var(--size-4-2);
  }

  .longform-compile-step:hover {
    border: var(--size-2-1) solid var(--text-accent);
    background-color: var(--background-modifier-form-field);
  }

  .longform-compile-step h3 {
    padding: var(--size-4-2) 0;
    margin: 0;
  }

  .longform-compile-step .longform-step-kind-pill {
    background-color: var(--text-accent);
    color: var(--text-on-accent);
    border-radius: var(--radius-l);
    font-size: var(--font-smallest);
    font-weight: bold;
    padding: var(--size-4-1);
    margin-right: var(--size-4-1);
    height: var(--size-4-5);
  }
</style>
