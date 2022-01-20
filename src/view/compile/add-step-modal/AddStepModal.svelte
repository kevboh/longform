<script lang="ts">
  import {
    workflows,
    currentWorkflow,
    projectMetadata,
    currentProjectPath,
    userScriptSteps,
  } from "src/view/stores";
  import { getContext } from "svelte";

  import { BUILTIN_STEPS } from "../../../compile/steps";
  import {
    CompileStep,
    explainStepKind,
    formatStepKind,
    Workflow,
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
    const currentWorkflowName = $projectMetadata[$currentProjectPath].workflow;
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
    gap: 1rem;
    grid-auto-rows: auto;
  }

  .longform-compile-step {
    cursor: pointer;
    grid-column: auto;
    grid-row: auto;
    background-color: var(--background-secondary);
    border: 2px solid var(--background-modifier-border);
    border-radius: 1rem;
    padding: 0.5rem;
  }

  .longform-compile-step:hover {
    border: 2px solid var(--text-accent);
    background-color: var(--background-modifier-form-field);
  }

  .longform-compile-step h3 {
    padding: 8px 0;
    margin: 0;
  }

  .longform-compile-step .longform-step-kind-pill {
    background-color: var(--text-accent);
    color: var(--text-on-accent);
    border-radius: 10px;
    font-size: 0.7rem;
    font-weight: bold;
    padding: 0.25rem;
    margin-right: 0.25rem;
    height: 1.2rem;
  }
</style>
