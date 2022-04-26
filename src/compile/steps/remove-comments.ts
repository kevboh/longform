import type {
  CompileContext,
  CompileInput,
  CompileManuscriptInput,
  CompileSceneInput,
} from "..";
import {
  CompileStepKind,
  makeBuiltinStep,
  CompileStepOptionType,
} from "./abstract-compile-step";

const MARKDOWN_COMMENTS_REGEX = /%%([\s\S]*?)%%/gm;
const HTML_COMMENTS_REGEX = /<!--([\s\S]*?)-->/gm;

export const RemoveCommentsStep = makeBuiltinStep({
  id: "remove-comments",
  description: {
    name: "Remove Comments",
    description: "Removes markdown and/or html comments.",
    availableKinds: [CompileStepKind.Scene, CompileStepKind.Manuscript],
    options: [
      {
        id: "remove-markdown-comments",
        name: "Remove Markdown Comments",
        description: "Remove markdown-style comments (%% text %%)",
        type: CompileStepOptionType.Boolean,
        default: true,
      },
      {
        id: "remove-html-comments",
        name: "Remove HTML Comments",
        description: "Remove HTML-style comments (<!-- text -->)",
        type: CompileStepOptionType.Boolean,
        default: true,
      },
    ],
  },
  compile(input: CompileInput, context: CompileContext): CompileInput {
    const removeMarkdownComments = context.optionValues[
      "remove-markdown-comments"
    ] as boolean;
    const removeHTMLComments = context.optionValues[
      "remove-html-comments"
    ] as boolean;

    const replaceComments = (contents: string) => {
      if (removeMarkdownComments) {
        contents = contents.replace(MARKDOWN_COMMENTS_REGEX, () => "");
      }
      if (removeHTMLComments) {
        contents = contents.replace(HTML_COMMENTS_REGEX, () => "");
      }

      return contents;
    };

    if (context.kind === CompileStepKind.Scene) {
      return (input as CompileSceneInput[]).map((sceneInput) => {
        const contents = replaceComments(sceneInput.contents);
        return {
          ...sceneInput,
          contents,
        };
      });
    } else {
      return {
        ...(input as CompileManuscriptInput),
        contents: replaceComments((input as any).contents),
      };
    }
  },
});
