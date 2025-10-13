import type {
  CompileContext,
  CompileInput,
  CompileManuscriptInput,
  CompileSceneInput,
} from "..";
import { CompileStepKind, makeBuiltinStep } from "./abstract-compile-step";

export const RemoveTasksStep = makeBuiltinStep({
  id: "remove-tasks",
  description: {
    name: "Remove Checkboxes",
    description: "Removes Markdown checkboxes and task list items.",
    availableKinds: [CompileStepKind.Scene, CompileStepKind.Manuscript],
    options: [],
  },
  compile(input: CompileInput, context: CompileContext): CompileInput {
    const removeTasksFromContent = (contents: string): string => {
      const lines = contents.split("\n");
      const resultLines = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check for a Markdown task item
        if (/^\s*[-*]\s+\[[ xX]\]/.test(line)) {
          // Skip this task line
          // Also check if the next line exists and is blank — skip that too
          const nextLine = lines[i + 1];
          if (nextLine !== undefined && /^\s*$/.test(nextLine)) {
            i++; // skip the blank line too
          }
          continue;
        }

        resultLines.push(line);
      }
      return resultLines.join("\n");
    };

    if (context.kind === CompileStepKind.Scene) {
      return (input as CompileSceneInput[]).map((sceneInput) => {
        const contents = removeTasksFromContent(sceneInput.contents);
        return {
          ...sceneInput,
          contents,
        };
      });
    } else {
      return {
        ...(input as CompileManuscriptInput),
        contents: removeTasksFromContent((input as any).contents),
      };
    }
  },
});
