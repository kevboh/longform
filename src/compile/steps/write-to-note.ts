import { normalizePath } from "obsidian";
import type { CompileManuscriptInput } from "..";

import {
  CompileContext,
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
          "Path for the created manuscript note, relative to your project.",
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
      const target = context.optionValues["target"] as string;
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
      } catch (e) {}

      await context.app.vault.adapter.write(path, input.contents);

      if (openAfter) {
        context.app.workspace.openLinkText(path, "/", true);
      }

      return input;
    }
  },
});
