import { parseYaml, stringifyYaml, Vault } from "obsidian";
import { omit } from "lodash";
import type { Writable } from "svelte/store";

import type { Draft, IndentedScene, MultipleSceneDraft } from "./types";
import { stripFrontmatter } from "./note-utils";
import { scenePath } from "src/model/scene-navigation";

export function draftTitle(draft: Draft): string {
  return draft.draftTitle ?? draft.vaultPath;
}

type SceneInsertionLocation = {
  at: "before" | "after" | "end";
  relativeTo: number | null;
};

export async function insertScene(
  draftsStore: Writable<Draft[]>,
  draft: MultipleSceneDraft,
  sceneName: string,
  vault: Vault,
  location: SceneInsertionLocation,
  createNoteCallback: (path: string) => Promise<void>
) {
  const newScenePath = scenePath(sceneName, draft, vault);

  if (!newScenePath || !draft || draft.format !== "scenes") {
    return;
  }

  await createNoteCallback(newScenePath);
  draftsStore.update((allDrafts) => {
    return allDrafts.map((d) => {
      if (d.vaultPath === draft.vaultPath && d.format === "scenes") {
        if (location.at === "end") {
          d.scenes = [...d.scenes, { title: sceneName, indent: 0 }];
        } else {
          const relativeScene = d.scenes[location.relativeTo];
          const index =
            location.at === "before"
              ? location.relativeTo
              : location.relativeTo + 1;
          d.scenes.splice(index, 0, {
            title: sceneName,
            indent: relativeScene.indent,
          });
        }
      }
      return d;
    });
  });
}

export function draftToYAML(draft: Draft): string {
  let longformEntry: Record<string, any> = {};
  longformEntry["format"] = draft.format;
  if (draft.titleInFrontmatter) {
    longformEntry["title"] = draft.title;
  }
  if (draft.draftTitle) {
    longformEntry["draftTitle"] = draft.draftTitle;
  }
  if (draft.workflow) {
    longformEntry["workflow"] = draft.workflow;
  }

  if (draft.format === "scenes") {
    longformEntry = Object.assign(longformEntry, {
      sceneFolder: draft.sceneFolder,
      scenes: indentedScenesToArrays(draft.scenes),
      ignoredFiles: draft.ignoredFiles,
    });
  }

  const obj = {
    longform: longformEntry,
  };

  return stringifyYaml(obj).trim();
}

export function indentedScenesToArrays(indented: IndentedScene[]) {
  const result: any = [];
  // track our current indentation level
  let currentIndent = 0;
  // array for the current indentation level
  let currentNesting = result;
  // memoized arrays so that later, lesser indents can use earlier-created array
  const nestingAt: Record<number, any> = {};
  nestingAt[0] = currentNesting;

  indented.forEach(({ title, indent }) => {
    if (indent > currentIndent) {
      // we're at a deeper indentation level than current,
      // so build up a nest and memoize it
      while (currentIndent < indent) {
        currentIndent = currentIndent + 1;
        const newNesting: any = [];
        currentNesting.push(newNesting);
        nestingAt[currentIndent] = newNesting;
        currentNesting = newNesting;
      }
    } else if (indent < currentIndent) {
      // we're at a lesser indentation level than current,
      // so drop back to previously memoized nesting
      currentNesting = nestingAt[indent];
      currentIndent = indent;
    }

    // actually insert the value
    currentNesting.push(title);
  });
  return result;
}

export function arraysToIndentedScenes(
  arr: any,
  result: IndentedScene[] = [],
  currentIndent = -1
): IndentedScene[] {
  if (arr instanceof Array) {
    if (arr.length === 0) {
      return result;
    }

    const next = arr.shift();
    const inner = arraysToIndentedScenes(next, [], currentIndent + 1);
    return arraysToIndentedScenes(arr, [...result, ...inner], currentIndent);
  } else {
    return [
      {
        title: arr,
        indent: currentIndent,
      },
    ];
  }
}

export type NumberedScene = IndentedScene & {
  numbering: number[];
};

export function numberScenes(scenes: IndentedScene[]): NumberedScene[] {
  const numbering = [0];
  let lastNumberedIndent = 0;

  return scenes.map((scene) => {
    const { indent } = scene;
    if (indent > lastNumberedIndent) {
      let fill = lastNumberedIndent + 1;
      while (fill <= indent) {
        numbering[fill] = 1;
        fill = fill + 1;
      }
      numbering[indent] = 0;
    } else if (indent < lastNumberedIndent) {
      const start = indent + 1;
      numbering.splice(start, numbering.length - start);
    }
    lastNumberedIndent = indent;

    numbering[indent] = numbering[indent] + 1;
    return {
      ...scene,
      numbering: [...numbering],
    };
  });
}

export function formatSceneNumber(numbering: number[]): string {
  return numbering.join(".");
}

export async function manuallyParseFrontmatter(
  path: string,
  vault: Vault
): Promise<any | null> {
  const contents = await vault.adapter.read(path);
  const regex = /^---\n(?<yaml>(?:.*?\n)*?)---/m;
  const result = contents.match(regex);
  if (!result || !result.groups || !result.groups["yaml"]) {
    return null;
  }
  const yaml = result.groups["yaml"];
  return parseYaml(yaml);
}

export async function insertDraftIntoFrontmatter(path: string, draft: Draft) {
  const metadata = app.metadataCache.getCache(path);
  let formatted = "";
  if (metadata) {
    const fm = omit(metadata.frontmatter, ["position", "longform"]);
    formatted =
      Object.keys(fm).length > 0 ? `${stringifyYaml(fm).trim()}\n` : "";
  }

  const newFm = `---\n${draftToYAML(draft)}\n${formatted}---\n\n`;

  const exists = await app.vault.adapter.exists(path);
  let contents = "";
  if (exists) {
    const fileContents = await app.vault.adapter.read(path);
    contents = stripFrontmatter(fileContents);
    contents = newFm + contents;
  } else {
    contents = newFm;
  }

  await app.vault.adapter.write(path, contents);
}
