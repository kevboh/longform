import type {
  CompileContext,
  CompileInput,
  CompileManuscriptInput,
  CompileSceneInput,
} from "..";
import { CompileStepKind, makeBuiltinStep } from "./abstract-compile-step";

const STRIKETHROUGH_REGEX = /~~(.*?)~~/gm;

export const RemoveStrikethroughsStep = makeBuiltinStep({
  id: "remove-strikethroughs",
  description: {
    name: "Remove Strikethroughs",
    description: "Removes struck-through ~~text~~.",
    availableKinds: [CompileStepKind.Scene, CompileStepKind.Manuscript],
    options: [],
  },
  compile(input: CompileInput, context: CompileContext): CompileInput {
    if (context.kind === CompileStepKind.Scene) {
      return (input as CompileSceneInput[]).map((sceneInput) => {
        return {
          ...sceneInput,
          contents: sceneInput.contents.replace(STRIKETHROUGH_REGEX, () => ""),
        };
      });
    } else {
      return {
        ...(input as CompileManuscriptInput),
        contents: (input as CompileManuscriptInput).contents.replace(
          STRIKETHROUGH_REGEX,
          () => ""
        ),
      };
    }
  },
});
