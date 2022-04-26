import type { CompileManuscriptInput } from "..";
import type { CompileContext, CompileInput } from "./abstract-compile-step";
import {
  CompileStepKind,
  CompileStepOptionType,
  makeBuiltinStep,
  typeMismatchError,
} from "./abstract-compile-step";

export const ConcatenateTextStep = makeBuiltinStep({
  id: "concatenate-text",
  description: {
    name: "Concatenate Text",
    description: "Combines all scenes together in order into a manuscript.",
    availableKinds: [CompileStepKind.Join],
    options: [
      {
        id: "separator",
        name: "Separator",
        description: "Text to put between joined scenes.",
        type: CompileStepOptionType.Text,
        default: "\n\n",
      },
    ],
  },
  compile(
    input: CompileInput,
    context: CompileContext
  ): CompileManuscriptInput {
    if (!Array.isArray(input)) {
      throw typeMismatchError("string[]", typeof input, context);
    }

    const separator = context.optionValues["separator"] as string;
    return {
      contents: input.map((i) => i.contents).join(separator),
    };
  },
});
