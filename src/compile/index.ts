import { normalizePath, App } from "obsidian";
import type { SerializedWorkflow } from "src/model/types";
import { get } from "svelte/store";

import { pluginSettings, projectMetadata } from "../view/stores";

import type {
  CompileContext,
  CompileStepKind,
  Workflow,
} from "./steps/abstract-compile-step";
export * from "./steps/abstract-compile-step";

export interface CompileOptions {
  includeHeaders: boolean;
  reportProgress: (status: string, complete: boolean) => void;
}

export interface CompileStatusError {
  kind: "CompileStatusError";
  error: string;
}

export interface CompileStatusStep {
  kind: "CompileStatusStep";
  stepIndex: number;
  totalSteps: number;
  stepKind: CompileStepKind;
}

export interface CompileStatusSuccess {
  kind: "CompileStatusSuccess";
}

export type CompileStatus =
  | CompileStatusError
  | CompileStatusStep
  | CompileStatusSuccess;

function formatOptionValues(values: { [key: string]: unknown }): {
  [key: string]: unknown;
} {
  const formattedOptions: { [key: string]: unknown } = {};
  for (const key of Object.keys(values)) {
    let v = values[key];
    if (typeof v === "string") {
      v = v.split("\\n").join("\n");
    }
    formattedOptions[key] = v;
  }
  return formattedOptions;
}

export async function compile(
  app: App,
  projectPath: string,
  draftName: string,
  workflow: Workflow,
  kinds: CompileStepKind[],
  statusCallback: (status: CompileStatus) => void
) {
  // Grab draft path and metadata
  const projectSettings = get(pluginSettings).projects[projectPath];
  if (!projectSettings) {
    const error = `No tracked project at ${projectPath} exists for compilation.`;
    console.error(`[Longform] ${error}`);
    statusCallback({
      kind: "CompileStatusError",
      error,
    });
    return;
  }

  const scenePath = (scene: string) =>
    normalizePath(
      `${projectPath}/${projectSettings.draftsPath}/${draftName}/${scene}.md`
    );

  const draftMetadata = get(projectMetadata)[projectPath].drafts.find(
    (d) => d.folder === draftName
  );
  if (!draftMetadata) {
    const error = `No draft named ${draftName} exists in ${projectPath} for compilation.`;
    console.error(`[Longform] ${error}`);
    statusCallback({
      kind: "CompileStatusError",
      error,
    });
    return;
  }

  let currentInput: any = [];

  // Build initial inputs
  for (const scene of draftMetadata.scenes) {
    const path = scenePath(scene);
    const contents = await app.vault.adapter.read(path);
    const metadata = app.metadataCache.getCache(path);

    currentInput.push({
      path,
      name: scene,
      contents,
      metadata,
    });
  }

  for (let index = 0; index < workflow.steps.length; index++) {
    const step = workflow.steps[index];
    const kind = index < kinds.length ? kinds[index] : null;
    if (kind === null) {
      const error = `No step kind data for step at position ${index}.`;
      console.error(`[Longform] ${error}`);
      statusCallback({
        kind: "CompileStatusError",
        error,
      });
      return;
    }
    const context: CompileContext = {
      kind,
      optionValues: formatOptionValues(step.optionValues),
      projectPath,
      app,
    };

    console.log(
      `[Longform] Running compile step ${step.description.name} with context:`,
      context
    );

    statusCallback({
      kind: "CompileStatusStep",
      stepIndex: index,
      totalSteps: workflow.steps.length,
      stepKind: kind,
    });

    // TODO: how to enforce typings here?
    try {
      currentInput = await step.compile(currentInput, context);
    } catch (error) {
      console.error("[Longform]", error);
      statusCallback({
        kind: "CompileStatusError",
        error: `${error}`,
      });
      return;
    }
  }

  console.log(
    `[Longform] Compile workflow "${workflow.name}" finished with final result:`,
    currentInput
  );

  statusCallback({
    kind: "CompileStatusSuccess",
  });
}

export const DEFAULT_WORKFLOWS: Record<string, SerializedWorkflow> = {
  "Default Workflow": {
    name: "Default Workflow",
    description:
      "A starter workflow. Feel free to edit, rename, or delete it and create your own.",
    steps: [
      {
        id: "strip-frontmatter",
        optionValues: {},
      },
      {
        id: "remove-links",
        optionValues: {
          "remove-wikilinks": true,
          "remove-external-links": true,
        },
      },
      {
        id: "prepend-title",
        optionValues: {
          format: "## $1",
          separator: "\n\n",
        },
      },
      {
        id: "concatenate-text",
        optionValues: {
          separator: "\\n\\n---\\n\\n",
        },
      },
      {
        id: "write-to-note",
        optionValues: {
          target: "manuscript.md",
          "open-after": true,
        },
      },
    ],
  },
};
