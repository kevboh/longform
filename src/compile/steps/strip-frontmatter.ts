import type {
  CompileContext,
  CompileInput,
  CompileManuscriptInput,
  CompileSceneInput,
} from "..";
import { CompileStepKind, makeBuiltinStep } from "./abstract-compile-step";

const FRONTMATTER_REGEX = /^---\n(?<yaml>(?:.*?\n)*?)---/m;

function stripFrontmatter(contents: string): string {
  return contents.replace(FRONTMATTER_REGEX, "");
}

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
        const contents = stripFrontmatter(sceneInput.contents);
        return {
          ...sceneInput,
          contents,
        };
      });
    } else {
      return {
        ...(input as CompileManuscriptInput),
        contents: stripFrontmatter((input as CompileManuscriptInput).contents),
      };
    }
  },
});
