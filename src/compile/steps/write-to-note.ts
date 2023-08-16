import { Notice, normalizePath } from "obsidian";
import type { CompileContext, CompileManuscriptInput } from "..";
import {
  CompileStepKind,
  CompileStepOptionType,
  makeBuiltinStep,
} from "./abstract-compile-step";

function resolvePath(
  projectPath: string,
  relativeFilePath: string,
): string {
  relativeFilePath = relativeFilePath.endsWith(".md") ? relativeFilePath : relativeFilePath + ".md";

  if (! relativeFilePath.startsWith(".")) {
    return normalizePath(`${projectPath}/${relativeFilePath}`);
  }

  /*
  Possible paths:
    ./filename.md
    ../filename.md
    ../../../filename.md

    obsidian won't let you open these file, but we can write to them.  Should give a warning.
    ./.filename.md
    ../.filename.md
    .blah.md

    illegal paths
    ...md
    .../filename.md
    ./.../filename.md
    .md -> impossible due to blank check in WriteToNoteStep
  */
 
  const filePathComponents = relativeFilePath.split('/');
  if (filePathComponents.length === 1) {
    // dealing with .filename.md path
    new Notice("Obsidian cannot open files that begin with a dot.  Consider a different name.");
    return normalizePath(`${projectPath}/${relativeFilePath}`);
  }

  const projectPathComponents = projectPath.split("/");
  let filePathComponent: string;
  let atStartOfPath = true;
  do {
    filePathComponent = filePathComponents.shift();
    if (filePathComponent !== "..") {
      if (atStartOfPath && filePathComponent === ".") {
        continue;
      }
      throw new Error("Invalid path for Save as Note.")
    }
    if (projectPathComponents.length === 0) {
      throw new Error('Invalid path for Save as Note.');
    }
    projectPathComponents.pop();
    if (filePathComponents[0] === '..') {
      filePathComponent = filePathComponents.shift();
    } else {
      break;
    }
    atStartOfPath = false;
  } while (filePathComponents.length > 1)

  return normalizePath(projectPathComponents.concat(filePathComponents).join("/"));


}

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
      const conatiningFolderParts = filePath.split("/");
      conatiningFolderParts.pop();
      const containingFolderPath = conatiningFolderParts.join("/");

      try {
        await context.app.vault.createFolder(containingFolderPath);
      } catch (e) {
        // do nothing, folder already existed
      }

      console.log('Writing to:', filePath);

      await context.app.vault.adapter.write(filePath, input.contents);

      if (openAfter) {
        console.log('Attempting to open:', filePath);

        context.app.workspace.openLinkText(filePath, "/", true)
          .catch(err => {
            console.error('Could not open', filePath);
            console.error(err);
          })
      }

      return input;
    }
  },
});
