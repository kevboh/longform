import { get } from "svelte/store";

import { BUILTIN_STEPS } from "./steps";
import type { CompileStep, Workflow } from "./steps/abstract-compile-step";
import { PLACEHOLDER_MISSING_STEP } from "./steps/abstract-compile-step";
import type { SerializedStep, SerializedWorkflow } from "src/model/types";
import { userScriptSteps } from "src/model/stores";

/**
 * Prepare a workflow for storage as json.
 * @param workflow The workflow to serialize.
 * @requires serialized An array of `SerializedStep`s that can be safely saved as json.
 */

export function serializeWorkflow(workflow: Workflow): SerializedWorkflow {
  const serialized: SerializedStep[] = workflow.steps.map((step) => ({
    id: step.description.canonicalID,
    optionValues: step.optionValues,
  })) as SerializedStep[];
  return {
    name: workflow.name,
    description: workflow.description,
    steps: serialized,
  };
}

function lookupStep(id: string, userSteps: CompileStep[] = []): CompileStep {
  const builtIn = BUILTIN_STEPS.find((s) => s.id === id);
  if (builtIn) {
    return builtIn;
  }

  const userStep = userSteps.find((s) => s.id === id);
  if (userStep) {
    return userStep;
  }

  return PLACEHOLDER_MISSING_STEP;
}

/**
 * Deserializes an array of JSON-compatible steps into one that can be run as a workflow.
 * @param w The JSON-compatible steps to deserialize.
 * @returns deserialized Array of `CompileStep`s to use as a workflow.
 */
export function deserializeWorkflow(w: SerializedWorkflow): Workflow {
  const userSteps = get(userScriptSteps) ?? [];

  const deserialized = {
    ...w,
    steps: w.steps.map((s) => {
      const step = lookupStep(s.id, userSteps);
      return {
        ...step,
        optionValues: s.optionValues,
      };
    }),
  };
  return deserialized;
}
