import { type App, normalizePath } from "obsidian";
import { stripFrontmatter } from "src/model/note-utils";
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
  draft: Draft,
  workflow: Workflow,
  kinds: CompileStepKind[],
  statusCallback: (status: CompileStatus) => void
): Promise<void> {
  // TODO: Compilation for single-scene projects!

  let currentInput: any;

  if (draft.format === "single") {
    const path = draft.vaultPath;
    const fullContents = await app.vault.adapter.read(path);
    const contents = stripFrontmatter(fullContents);
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
    for (const scene of draft.scenes) {
      const path = scenePathForFolder(scene.title, folderPath);
      const contents = await app.vault.adapter.read(path);
      const metadata = app.metadataCache.getCache(path);

      currentInput.push({
        path,
        name: scene.title,
        contents,
        metadata,
        indentationLevel: scene.indent,
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
        currentInput[0].contents = result;
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
