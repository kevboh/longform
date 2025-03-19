<script lang="ts">
  // @ts-nocheck
  import {
    type CompileStep,
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
        <h4><span class="longform-compile-step-number">{ordinal}</span>{step.description.name}</h4>
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
    {#if step.description.options.length > 0}
      <div class="longform-compile-step-options">
        <div>
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
      </div>
    {/if}
    {#if error}
      <div class="longform-compile-step-error-container">
        <p class="longform-compile-step-error">{error}</p>
      </div>
    {/if}
  {/if}
</div>

<style>
  .longform-compile-step {
    background-color: var(--background-modifier-border);
    border: 1px solid var(--background-modifier-border);
    border-radius: var(--radius-s);
    padding: 0;
    margin: var(--size-4-4) 0;
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
    font-size: var(--font-ui-smaller);
  }

  .longform-compile-step-title-container h4 {
    display: inline-block;
    margin: var(--size-4-1) var(--size-4-2) var(--size-4-1) 0;
    padding: 0;
  }

  .longform-compile-step-title-container .longform-step-kind-pill {
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: color-mix(in srgb, var(--text-accent) 50%, var(--background-modifier-border) 50%);
    color: var(--text-on-accent);
    border-radius: var(--radius-l);
    font-size: var(--font-smallest);
    font-weight: bold;
    padding: var(--size-4-1) var(--size-4-2);
    margin-right: var(--size-4-1);
    height: var(--h1-line-height);
  }

  .longform-compile-step-number {
    color: var(--text-faint);
    display: inline-block;
    width: var(--size-4-6);
    padding-left: var(--size-4-1);
  }

  .longform-remove-step-button {
    display: flex;
    width: var(--size-4-5);
    height: 100%;
    margin: 1px;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    background: var(--background-modifier-error);
  }

  .longform-compile-step p {
    margin: 0;
    background: var(--background-primary);
  }

  .longform-compile-step-description {
    font-size: var(--font-smallest);
    color: var(--text-muted);
    padding: var(--size-4-2) var(--size-4-1) var(--size-4-2) var(--size-4-6);
  }

    .longform-compile-step-description .solo {
      padding-right: var(--size-4-6);
    }

  .longform-compile-step-options {
    padding: var(--size-4-2) 0;
    background: var(--background-primary);
  }

  .longform-compile-step-options > div {
    margin: 0 var(--size-4-2) 0 var(--size-4-6)
  }

  .longform-compile-step-option {
    margin: 0 var(--size-4-4) var(--size-4-4) 0;
  }

  .longform-compile-step-option label {
    display: block;
    font-weight: 600;
    font-size: var(--font-smallest);
  }

  .longform-compile-step-checkbox-container {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
  }

  .longform-compile-step-option input[type="text"] {
    margin: 0 0 var(--size-4-1) 0;
    width: 100%;
  }

  .longform-compile-step-option input[type="checkbox"] {
    margin: 0 var(--size-4-2) var(--size-2-1) 0;
  }

  .longform-compile-step-option input:focus {
    color: var(--text-accent-hover);
  }

  .longform-compile-step-option-description {
    font-size: var(--font-smallest);
    line-height: 1em;
    color: var(--text-faint);
  }

  .longform-compile-step-error-container {
    margin-top: var(--size-4-2);
  }

  .longform-compile-step-error {
    color: var(--text-error);
    font-size: var(--font-smallest);
    line-height: 1em;
  }
</style>