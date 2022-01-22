import type { CompileSceneInput } from "..";
import {
  CompileContext,
  CompileStepKind,
  makeBuiltinStep,
  CompileStepOptionType,
} from "./abstract-compile-step";

export const PrependTitleStep = makeBuiltinStep({
  id: "prepend-title",
  description: {
    name: "Prepend Title",
    description: "Prepends the scene title to the scene text.",
    availableKinds: [CompileStepKind.Scene],
    options: [
      {
        id: "format",
        name: "Title Format",
        description:
          "Format of title. $1 will be replaced with title. $2, if present, will be replaced with scene number.",
        type: CompileStepOptionType.Text,
        default: "$1",
      },
      {
        id: "separator",
        name: "Separator",
        description: "Text to put between title and scene text.",
        type: CompileStepOptionType.Text,
        default: "\n\n",
      },
    ],
  },
  compile(
    input: CompileSceneInput[],
    context: CompileContext
  ): CompileSceneInput[] {
    const format = context.optionValues["format"] as string;
    const separator = context.optionValues["separator"] as string;

    return input.map((sceneInput, index) => {
      const title = format
        .replace("$1", sceneInput.name)
        .replace("$2", `${index + 1}`);
      const contents = `${title}${separator}${sceneInput.contents}`;
      return {
        ...sceneInput,
        contents,
      };
    });
  },
});
