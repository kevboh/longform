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

const WIKILINKS_REGEX = /\[\[([^[|]+)(|[^[]+)?\]\]/gm;
const EXTERNAL_LINKS_REGEX = /\[([^[]+)\](\(.*\))/gm;

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
        contents = replaceWikiLinks(contents)
      }
      if (removeExternalLinks) {
        contents = replaceExternalLinks(contents)
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
  return contents.replace(WIKILINKS_REGEX, (_match, p1, p2) => {
    if (p2) {
      return p2.slice(1);
    } else {
      return p1;
    }
  })
}

export function replaceExternalLinks(contents: string): string {
  return contents.replace(EXTERNAL_LINKS_REGEX, (_match, p1) => p1)
}