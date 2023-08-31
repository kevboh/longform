import { App, Notice, normalizePath } from "obsidian";
import type { CompileContext, CompileManuscriptInput } from "..";
import {
  CompileStepKind,
  CompileStepOptionType,
  makeBuiltinStep,
} from "./abstract-compile-step";

export const WriteToNoteStep = makeBuiltinStep({
  id: "write-to-note",
  description: {
    name: "Save as Note",
    description: "Saves your manuscript as a note in your vault.",
    availableKinds: [CompileStepKind.Manuscript],
    options: [
      {
        id: "target",
        name: "Output path",
        description:
          "Path for the created manuscript note, relative to your project. $1 will be replaced with your project’s title.",
        type: CompileStepOptionType.Text,
        default: "manuscript.md",
      },
      {
        id: "open-after",
        name: "Open Compiled Manuscript",
        description: "If checked, open the compiled manuscript in a new pane.",
        type: CompileStepOptionType.Boolean,
        default: true,
      },
    ],
  },
  async compile(
    input: CompileManuscriptInput,
    context: CompileContext
  ): Promise<CompileManuscriptInput> {
    if (context.kind !== CompileStepKind.Manuscript) {
      throw new Error("Cannot write non-manuscript as note.");
    } else {
      let target = context.optionValues["target"] as string;
      target = target.replace("$1", context.draft.title);

      const openAfter = context.optionValues["open-after"] as boolean;
      if (!target || target.length == 0) {
        throw new Error("Invalid path for Save as Note.");
      }

      const filePath = resolvePath(context.projectPath, target);
      await writeToFile(context.app, filePath, input.contents);

      if (openAfter) {
        console.log('[Longform] Attempting to open:', filePath);

        context.app.workspace.openLinkText(filePath, "/", true)
          .catch(err => {
            console.error('[Longform] Could not open', filePath, err);
          })
      }

      return input;
    }
  },
});

async function writeToFile(app: App, filePath: string, contents: string) {
  await ensureContainingFolderExists(app, filePath);

  console.log('[Longform] Writing to:', filePath);

  await app.vault.adapter.write(filePath, contents);
}

async function ensureContainingFolderExists(app: App, filePath: string) {
  const conatiningFolderParts = filePath.split("/");
  const containingFolderPath = conatiningFolderParts.slice(0, -1).join("/");

  try {
    await app.vault.createFolder(containingFolderPath);
  } catch (e) {
    // do nothing, folder already existed
  }
}

function resolvePath(
  projectPath: string,
  filePath: string,
): string {
  filePath = filePath.endsWith(".md") ? filePath : filePath + ".md";

  if (!filePath.startsWith(".")) {
    if (filePath.startsWith("/")) {
      // handle file path like: /filename.md
      return normalizePath(`${projectPath}${filePath}`);
    }
    return normalizePath(`${projectPath}/${filePath}`);
  }

  /*
  Possible paths:
    filename.md
    ./filename.md
    ../filename.md
    ../../../filename.md

    obsidian won't let you open these file, but we can write to them.  Should give a warning.
    ./.filename.md
    ../.filename.md
    ...md
    ../../...md
    .blah.md

    illegal paths (this will be caught when an attempt to write to these sorts of files is made)
    .../filename.md
    ./.../filename.md
    .md -> impossible due to blank check in WriteToNoteStep
  */
 
  return resolveRelativeFilePath(
    projectPath.split("/"),
    filePath.split("/"),
  )
}

function resolveRelativeFilePath(
  projectPathComponents: string[],
  filePathComponents: string[],
  atStartOfFilePath: boolean = true,
) {
  // should never be empty due to blank check in WriteToNoteStep
  // and String.split() will return an array of at least one element
  const filePathComponent = filePathComponents.first();
  switch (filePathComponent) {
    case "..":
      // move up one folder
      if (projectPathComponents.length === 0) {
        // we moved up too many folders and ran out.
        throw new Error("[Longform] Invalid path for Save as Note.")
      }
      // remove the lowest-level folder from the project path to move up, 
      // and take this first component off the top of the filePathComponents
      return resolveRelativeFilePath(projectPathComponents.slice(0, -1), filePathComponents.slice(1), false)
    case ".":
      // relative to current folder
      if (! atStartOfFilePath) {
        // illegal path like: ././filename.md
        throw new Error("[Longform] Invalid path for Save as Note.")
      }
      // stay here, but remove the first filepath component
      return resolveRelativeFilePath(projectPathComponents, filePathComponents.slice(1), false)
    default:
      const filename = filePathComponents.last()
      if (filename.startsWith(".")) {
        new Notice("Obsidian cannot open files that begin with a dot. Consider a different name.");
      }
      // assume there are no more ".." in the rest of the filePathComponents
      return normalizePath(projectPathComponents.concat(filePathComponents).join("/"));
  }
}