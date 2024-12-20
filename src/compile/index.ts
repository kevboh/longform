import { type App, normalizePath } from "obsidian";
import { numberScenes } from "src/model/draft-utils";
import {
  projectFolderPath,
  sceneFolderPath,
  scenePathForFolder,
} from "src/model/scene-navigation";
import type { Draft, SerializedWorkflow } from "src/model/types";
import {
  CompileStepKind,
  type CompileContext,
  type Workflow,
  PLACEHOLDER_MISSING_STEP,
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

export enum WorkflowError {
  Valid = "",
  BadFirstStep = "The first step must be of Scene or Join type; compilation begins with all scenes as input.",
  MissingJoinStep = "A Manuscript step must occur after a Join step; Manuscript steps run on a single file, not all scenes.",
  ScenesStepPostJoin = "A Scene or Join step cannot occur after a Join step; at this point in the workflow, steps must operate on a single file.",
  UnloadedStep = "This workflow contains a step that could not be loaded. Please delete or replace it.",
  JoinForSingle = "Single-scene projects do not support Join steps.",
}

export type WorkflowValidationResult = {
  error: WorkflowError;
  stepPosition: number;
};

export function calculateWorkflow(
  workflow: Workflow,
  isMultiScene: boolean
): [WorkflowValidationResult, CompileStepKind[]] {
  if (!workflow) {
    return;
  }

  let currentKind = null;
  const calculatedKinds: CompileStepKind[] = [];
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

export async function compile(
  app: App,
  draft: Draft,
  workflow: Workflow,
  kinds: CompileStepKind[],
  statusCallback: (status: CompileStatus) => void
): Promise<void> {
  let currentInput: any;

  if (draft.format === "single") {
    const path = draft.vaultPath;
    const contents = await app.vault.adapter.read(path);
    const metadata = app.metadataCache.getCache(path);

    currentInput = [
      {
        path,
        name: draft.title,
        contents,
        metadata,
      },
    ];
  } else {
    const folderPath = sceneFolderPath(draft, app.vault);

    currentInput = [];

    // Build initial inputs
    for (const scene of numberScenes(draft.scenes)) {
      const path = scenePathForFolder(scene.title, folderPath);
      const contents = await app.vault.adapter.read(path);
      const metadata = app.metadataCache.getCache(path);

      currentInput.push({
        path,
        name: scene.title,
        contents,
        metadata,
        indentationLevel: scene.indent,
        numbering: scene.numbering,
      });
    }
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
      projectPath: projectFolderPath(draft, app.vault),
      draft,
      app,
      utilities: {
        normalizePath,
      },
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
      // handle the case where we're going scene -> manuscript -> scene
      if (draft.format === "single" && kind === CompileStepKind.Manuscript) {
        const result = await step.compile(
          {
            contents: currentInput[0].contents,
          },
          context
        );
        currentInput[0] = result;
      } else {
        currentInput = await step.compile(currentInput, context);
      }
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
          format: "$3{#} $1",
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
