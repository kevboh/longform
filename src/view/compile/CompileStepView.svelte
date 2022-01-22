<script lang="ts">
  import {
    CompileStep,
    CompileStepKind,
    CompileStepOptionType,
    explainStepKind,
    formatStepKind,
    PLACEHOLDER_MISSING_STEP,
  } from "src/compile/steps/abstract-compile-step";
  import { createEventDispatcher } from "svelte";

  export let step: CompileStep;
  export let ordinal: number;
  export let calculatedKind: CompileStepKind | null;
  export let error: string | null;

  const dispatch = createEventDispatcher();

  function removeStep() {
    dispatch("removeStep");
  }
</script>

<div class="longform-compile-step">
  {#if step.description.canonicalID === PLACEHOLDER_MISSING_STEP.description.canonicalID}
    <div class="longform-compile-step-title-outer">
      <div class="longform-compile-step-title-container">
        <h4>Invalid Step</h4>
      </div>
      <button class="longform-remove-step-button" on:click={removeStep}
        >X</button
      >
    </div>
    <div class="longform-compile-step-error-container">
      <p class="longform-compile-step-error">
        This workflow contains a step that could not be loaded. Please delete
        the step to be able to run this workflow. If you’re on mobile, this may
        be a user script step that did not load.
      </p>
    </div>
  {:else}
    <div class="longform-compile-step-title-outer">
      <div class="longform-compile-step-title-container">
        <h4>{ordinal}. {step.description.name}</h4>
        {#if calculatedKind !== null}
          <div
            class="longform-step-kind-pill"
            title={explainStepKind(calculatedKind)}
          >
            {formatStepKind(calculatedKind)}
          </div>
        {/if}
      </div>
      <button class="longform-remove-step-button" on:click={removeStep}
        >X</button
      >
    </div>
    <p class="longform-compile-step-description">
      {step.description.description}
    </p>
    <div class="longform-compile-step-options">
      {#each step.description.options as option}
        <div class="longform-compile-step-option">
          {#if option.type === CompileStepOptionType.Text}
            <label for={step.id + "-" + option.id}>{option.name}</label>
            <input
              id={step.id + "-" + option.id}
              type="text"
              placeholder={option.default.replace(/\n/g, "\\n")}
              bind:value={step.optionValues[option.id]}
            />
          {:else}
            <div class="longform-compile-step-checkbox-container">
              <input
                id={step.id + "-" + option.id}
                type="checkbox"
                bind:checked={step.optionValues[option.id]}
              />
              <label for={step.id + "-" + option.id}>{option.name}</label>
            </div>
          {/if}
          <p class="longform-compile-step-option-description">
            {option.description}
          </p>
        </div>
      {/each}
    </div>
    {#if error}
      <div class="longform-compile-step-error-container">
        <p class="longform-compile-step-error">{error}</p>
      </div>
    {/if}
  {/if}
</div>

<style>
  .longform-compile-step {
    background-color: var(--background-modifier-form-field);
    border-radius: 5px;
    padding: 0.25rem 0.25rem 0.75rem 0.25rem;
    margin-bottom: 1rem;
  }

  .longform-compile-step-title-outer {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
  }

  .longform-compile-step-title-container {
    display: flex;
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
  }

  .longform-compile-step-title-container h4 {
    display: inline-block;
    margin: 0 0.5rem 0 0;
    padding: 0;
  }

  .longform-compile-step-title-container .longform-step-kind-pill {
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: var(--text-accent);
    color: var(--text-on-accent);
    border-radius: 10px;
    font-size: 0.7rem;
    font-weight: bold;
    padding: 0.25rem;
    margin-right: 0.25rem;
    height: 1.2rem;
  }

  .longform-remove-step-button {
    display: flex;
    width: 20px;
    margin: 0;
    align-items: center;
    justify-content: center;
    font-weight: bold;
  }

  .longform-compile-step p {
    margin: 0;
    padding: 0;
  }

  .longform-compile-step-description {
    font-size: 80%;
    color: var(--text-muted);
    margin-top: 2px;
  }

  .longform-compile-step-options {
    padding-left: 0.5rem;
    border-left: 1px solid var(--interactive-accent);
  }

  .longform-compile-step-option {
    margin-top: 0.5rem;
  }

  .longform-compile-step-option label {
    display: block;
    font-weight: 600;
    font-size: 0.8rem;
  }

  .longform-compile-step-option input {
    color: var(--text-accent);
  }

  .longform-compile-step-checkbox-container {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
  }

  .longform-compile-step-option input[type="text"] {
    color: var(--text-accent);
    margin: 0 0 4px 0;
  }

  .longform-compile-step-option input[type="checkbox"] {
    color: var(--text-accent);
    margin: 0 0.5rem 2px 0;
  }

  .longform-compile-step-option input:focus {
    color: var(--text-accent-hover);
  }

  .longform-compile-step-option-description {
    font-size: 0.8rem;
    line-height: 0.9rem;
    color: var(--text-faint);
  }

  .longform-compile-step-error-container {
    margin-top: 0.5rem;
  }

  .longform-compile-step-error {
    color: var(--text-error);
    font-size: 0.8rem;
    line-height: 0.9rem;
  }
</style>
