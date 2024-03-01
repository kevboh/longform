import type { Directory } from "./file-system";
import type { Draft, IndentedScene } from "./types";

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
