import type {
  CompileInput,
  CompileManuscriptInput,
  CompileSceneInput,
} from "..";
import {
  CompileContext,
  CompileStepKind,
  makeBuiltinStep,
} from "./abstract-compile-step";

export const StripFrontmatterStep = makeBuiltinStep({
  id: "strip-frontmatter",
  description: {
    name: "Strip Frontmatter",
    description:
      "Removes the YAML frontmatter section from the scene or manuscript.",
    availableKinds: [CompileStepKind.Scene, CompileStepKind.Manuscript],
    options: [],
  },
  compile(input: CompileInput, context: CompileContext): CompileInput {
    if (context.kind === CompileStepKind.Scene) {
      return (input as CompileSceneInput[]).map((sceneInput) => {
        const contents = sceneInput.contents.replace(
          /^---(.*?\n)*---\n*/gm,
          ""
        );
        return {
          ...sceneInput,
          contents,
        };
      });
    } else {
      return {
        ...(input as CompileManuscriptInput),
        contents: (input as CompileManuscriptInput).contents.replace(
          /^---(.*?\n)*---\n*/gm,
          ""
        ),
      };
    }
  },
});
