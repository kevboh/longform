import { normalizePath } from "obsidian";
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
      const file = target.endsWith(".md") ? target : target + ".md";
      const path = normalizePath(`${context.projectPath}/${file}`);

      const pathComponents = path.split("/");
      pathComponents.pop();

      try {
        await context.app.vault.createFolder(pathComponents.join("/"));
      } catch (e) {
        // do nothing, folder already existed
      }

      await context.app.vault.adapter.write(path, input.contents);

      if (openAfter) {
        context.app.workspace.openLinkText(path, "/", true);
      }

      return input;
    }
  },
});
