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

export const RemoveLinksStep = makeBuiltinStep({
  id: "remove-links",
  description: {
    name: "Remove Links",
    description: "Removes wiki and/or external links.",
    availableKinds: [CompileStepKind.Scene, CompileStepKind.Manuscript],
    options: [
      {
        id: "remove-wikilinks",
        name: "Remove Wikilinks",
        description: "Remove brackets from [[wikilinks]].",
        type: CompileStepOptionType.Boolean,
        default: true,
      },
      {
        id: "remove-external-links",
        name: "Remove External Links",
        description: "Remove external links, leaving only the anchor text.",
        type: CompileStepOptionType.Boolean,
        default: true,
      },
    ],
  },
  compile(input: CompileInput, context: CompileContext): CompileInput {
    const removeWikilinks = context.optionValues["remove-wikilinks"] as boolean;
    const removeExternalLinks = context.optionValues[
      "remove-external-links"
    ] as boolean;

    const replaceLinks = (contents: string) => {
      if (removeWikilinks) {
        contents = replaceWikiLinks(contents);
      }
      if (removeExternalLinks) {
        contents = replaceExternalLinks(contents);
      }

      return contents;
    };

    if (context.kind === CompileStepKind.Scene) {
      return (input as CompileSceneInput[]).map((sceneInput) => {
        const contents = replaceLinks(sceneInput.contents);
        return {
          ...sceneInput,
          contents,
        };
      });
    } else {
      return {
        ...(input as CompileManuscriptInput),
        contents: replaceLinks((input as any).contents),
      };
    }
  },
});

export function replaceWikiLinks(contents: string): string {
  let startOfAlias = -1;
  let additionalAlias = false;
  let end = -1;

  // moving backward allows us to replace within the loop,
  // so no additional memory.
  for (let i = contents.length - 1; i >= 0; i--) {
    const char = contents.charAt(i);
    if (end < 0) {
      if (char === "]") {
        if (i > 0 && contents.charAt(i - 1) === "]") {
          end = i;
          // can skip the next character
          i = i - 1;
        }
      }
    } else {
      if (char === "|") {
        if (startOfAlias >= 0) {
          additionalAlias = true;
        }
        startOfAlias = i + 1; // update to ealiest instance of the character
        continue;
      }
      if (char === "[") {
        if (i > 0 && contents.charAt(i - 1) === "[") {
          if (i > 1 && contents.charAt(i - 2) === "!") {
            // embed, jump to i -2
            i = i - 2;
          } else if (i === end - 2) {
            // brackets are empty and should just display as [[]]
            i = i - 1;
          } else {
            let replacement: string;
            if (startOfAlias >= 0) {
              if (additionalAlias) {
                // remove all instances of "|"
                replacement = contents
                  .slice(startOfAlias, end - 1)
                  .replace(/\|/gm, "");
              } else {
                replacement = contents.slice(startOfAlias, end - 1);
              }
            } else {
              replacement = contents.slice(i + 1, end - 1);
            }
            contents =
              contents.slice(0, i - 1) + replacement + contents.slice(end + 1);
            // can skip the next character
            i = i - 1;
          }
          end = -1;
          additionalAlias = false;
          startOfAlias = -1;
          continue;
        }
      }
    }
  }

  return contents;
}

export function replaceExternalLinks(contents: string): string {
  let end = -1;
  let aliasEnd = -1;

  // moving backward allows us to replace within the loop,
  // so no additional memory.
  for (let i = contents.length - 1; i >= 0; i--) {
    const char = contents.charAt(i);
    if (end < 0) {
      if (char === ")") {
        end = i;
      }
    } else {
      if (aliasEnd < 0) {
        if (char === "(") {
          if (i > 0 && contents.charAt(i - 1) === "]") {
            aliasEnd = i - 1;
          } else {
            // invalid link
            end = -1;
            aliasEnd = -1;
          }
          // can skip the next character
          i = i - 1;
          continue;
        }
      } else {
        if (char === "[") {
          if (i > 0 && contents.charAt(i - 1) === "!") {
            // embed, jump to i - 1
            i = i - 1;
          } else {
            const replacement = contents.slice(i + 1, aliasEnd);
            contents =
              contents.slice(0, i) + replacement + contents.slice(end + 1);
          }
          end = -1;
          aliasEnd = -1;
          continue;
        }
      }
    }
  }

  return contents;
}
