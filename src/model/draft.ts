import { isEqual } from "lodash";
import type { Directory, Note } from "./file-system";
import { drafts } from "./stores";
import type { Draft, IndentedScene } from "./types";
import { fileNameFromPath } from "./note-utils";
import type { Writable } from "svelte/store";

export async function insertDraftIntoFrontmatter(
  fileSystem: Directory,
  path: string,
  draft: Draft
) {
  const exists = await fileSystem.pathExists(path);
  if (!exists) {
    await fileSystem.createFile(path, "");
  }

  const file = fileSystem.getPath(path);
  if (!file.isNote) {
    console.warn("file at", path, "is not a note");
    // TODO: error?
    return;
  }
  try {
    await file.modifyFrontMatter((frontmatter) => {
      setDraftOnFrontmatterObject(frontmatter, draft);
    });
  } catch (error) {
    console.error(
      "[Longform] insertDraftIntoFrontmatter: processFrontMatter error:",
      error
    );
  }
}

export function setDraftOnFrontmatterObject(
  obj: Record<string, any>,
  draft: Draft
) {
  obj["longform"] = {};
  obj["longform"]["format"] = draft.format;
  if (draft.titleInFrontmatter) {
    obj["longform"]["title"] = draft.title;
  }
  if (draft.draftTitle) {
    obj["longform"]["draftTitle"] = draft.draftTitle;
  }
  if (draft.workflow) {
    obj["longform"]["workflow"] = draft.workflow;
  }

  if (draft.format === "scenes") {
    obj["longform"]["sceneFolder"] = draft.sceneFolder;
    obj["longform"]["scenes"] = indentedScenesToArrays(draft.scenes);
    if (draft.sceneTemplate) {
      obj["longform"]["sceneTemplate"] = draft.sceneTemplate;
    }
    obj["longform"]["ignoredFiles"] = draft.ignoredFiles;
  }
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

export async function possibleDraftFileCreated(
  fileSystem: Directory,
  draftCache: {
    getCachedDraftByPath(path: string): Draft | null;
    cacheDraft(draft: Draft): void;
  },

  note: Note
): Promise<{ drafts: Writable<Draft[]>; createdDraft: Draft | null }> {
  const result: { draft: Draft } | null = await draftForNote(fileSystem, note);
  if (!result) {
    const testDeletedDraft = draftCache.getCachedDraftByPath(note.path);
    if (testDeletedDraft) {
      // a draft's YAML was removed, remove it from drafts
      drafts.update((drafts) => {
        return drafts.filter((d) => d.vaultPath !== note.path);
      });
    }
    return { drafts, createdDraft: null };
  }

  const { draft } = result;

  const old = draftCache.getCachedDraftByPath(draft.vaultPath);
  if (!old || !isEqual(draft, old)) {
    draftCache.cacheDraft(draft);
    drafts.update((drafts) => {
      const indexOfDraft = drafts.findIndex(
        (d) => d.vaultPath === draft.vaultPath
      );
      if (indexOfDraft < 0) {
        //new draft
        drafts.push(draft);
      } else {
        drafts[indexOfDraft] = draft;
      }
      return drafts;
    });
  }

  return { drafts, createdDraft: draft };
}

// if dirty, draft is modified from reality of index file
// and should be written back to index file
export async function draftForNote(
  fileSystem: Directory,
  note: Note
): Promise<{ draft: Draft; dirty: boolean } | null> {
  const frontmatter = note.getMetadata().frontmatter;
  if (!frontmatter) {
    return null;
  }
  const longformEntry = frontmatter["longform"];
  if (!longformEntry) {
    return null;
  }
  const format = longformEntry["format"];
  const vaultPath = note.path;
  let title = longformEntry["title"];
  let titleInFrontmatter = true;
  if (!title) {
    titleInFrontmatter = false;
    title = fileNameFromPath(vaultPath);
  }
  const workflow = longformEntry["workflow"] ?? null;
  const draftTitle = longformEntry["draftTitle"] ?? null;

  if (format === "scenes") {
    let rawScenes: any = longformEntry["scenes"] ?? [];

    if (rawScenes.length === 0) {
      // fallback for issue where the metadata cache seems to fail to recognize yaml arrays.
      // in this case, it reports the array as empty when it's not,
      // so we will parse out the yaml directly from the file contents, just in case.
      // discord discussion: https://discord.com/channels/686053708261228577/840286264964022302/994589562082951219

      // 2023-01-03: Confirmed this issue is still present; using new processFrontMatter function
      // seems to read correctly, though!

      let fm = null;
      try {
        await note.modifyFrontMatter((_fm) => {
          fm = _fm;
        });
      } catch (error) {
        console.error("[Longform] error manually loading frontmatter:", error);
      }

      if (fm) {
        rawScenes = fm["longform"]["scenes"];
      }
    }

    // Convert to indented scenes
    const scenes = arraysToIndentedScenes(rawScenes);
    const sceneFolder = longformEntry["sceneFolder"] ?? "/";
    const sceneTemplate = longformEntry["sceneTemplate"] ?? null;
    const ignoredFiles: string[] = longformEntry["ignoredFiles"] ?? [];
    const normalizedSceneFolder = `${note.path
      .split("/")
      .slice(0, -1)
      .join("/")}/${sceneFolder}`;

    let filenamesInSceneFolder: string[] = [];
    if (await fileSystem.pathExists(normalizedSceneFolder)) {
      filenamesInSceneFolder = (
        await fileSystem.list(normalizedSceneFolder)
      ).files
        .filter((f) => f.endsWith(".md") && f !== note.path)
        .map((f) => f.slice(0, -3));
    }

    // Filter removed scenes
    const knownScenes = scenes.filter(({ title }) =>
      filenamesInSceneFolder.includes(title)
    );

    const dirty = knownScenes.length !== scenes.length;

    const sceneTitles = new Set(scenes.map((s) => s.title));
    const newScenes = filenamesInSceneFolder.filter((s) => !sceneTitles.has(s));

    // ignore all new scenes that are known-to-ignore per ignoredFiles
    const ignoredRegexes = ignoredFiles.map((p) => ignoredPatternToRegex(p));
    const unknownFiles = newScenes.filter(
      (s) => ignoredRegexes.find((r) => r.test(s)) === undefined
    );

    return {
      draft: {
        format: "scenes",
        title,
        titleInFrontmatter,
        draftTitle,
        vaultPath,
        sceneFolder,
        scenes: knownScenes,
        ignoredFiles,
        unknownFiles,
        sceneTemplate,
        workflow,
      },
      dirty,
    };
  } else if (format === "single") {
    return {
      draft: {
        format: "single",
        title,
        titleInFrontmatter,
        draftTitle,
        vaultPath,
        workflow,
      },
      dirty: false,
    };
  } else {
    console.log(
      `[Longform] Error loading draft at ${note.path}: invalid longform.format. Ignoring.`
    );
    return null;
  }
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

const ESCAPED_CHARACTERS = new Set("/&$^+.()=!|[]{},".split(""));
function ignoredPatternToRegex(pattern: string): RegExp {
  let regex = "";

  for (let index = 0; index < pattern.length; index++) {
    const c = pattern[index];

    if (ESCAPED_CHARACTERS.has(c)) {
      regex += "\\" + c;
    } else if (c === "*") {
      regex += ".*";
    } else if (c === "?") {
      regex += ".";
    } else {
      regex += c;
    }
  }

  return new RegExp(`^${regex}$`);
}
