import { last, sum } from "lodash";
import type { TFile } from "obsidian";

import type { Draft, DraftWordCounts } from "./types";

export function fileNameFromPath(path: string): string {
  return last(path.split("/")).split(".md")[0];
}

/**
 * Creates a note at `path` with a given `template` if a templating plugin is enabled.
 * Prefers Templater, then the core Templates plugin, then a plain note without using the template.
 * @param path Path to note to create.
 * @param template Path to template to use.
 */
export async function createNoteWithPotentialTemplate(
  path: string,
  template: string | null
): Promise<void> {
  const file = await app.vault.create(path, "");
  if (template) {
    let contents = "";
    let pluginUsed = "";
    try {
      if (isTemplaterEnabled()) {
        pluginUsed = "Templater";
        contents = await createWithTemplater(file, template);
      } else if (isTemplatesEnabled()) {
        pluginUsed = "Core Templates";
        contents = await createWithTemplates(template);
      }
    } catch (error) {
      console.error(`[Longform] Error using plugin [${pluginUsed}]:`, error);
    }
    if (contents !== "") {
      await app.vault.adapter.write(path, contents);
    }
  }
}

function isTemplaterEnabled(): boolean {
  return !!(app as any).plugins.getPlugin("templater-obsidian");
}

function isTemplatesEnabled(): boolean {
  return !!(app as any).internalPlugins.getEnabledPluginById("templates");
}

async function createWithTemplater(
  file: TFile,
  templatePath: string
): Promise<string> {
  const templaterPlugin = (app as any).plugins.getPlugin("templater-obsidian");
  if (!templaterPlugin) {
    console.error(
      "[Longform] Attempted to use Templater plugin while disabled."
    );
    return;
  }
  const template = app.vault.getAbstractFileByPath(templatePath);

  const runningConfig = templaterPlugin.templater.create_running_config(
    template,
    file,
    0
  );
  return await templaterPlugin.templater.read_and_parse_template(runningConfig);
}

async function createWithTemplates(templatePath: string): Promise<string> {
  console.log(templatePath);
  const corePlugin = (app as any).internalPlugins.getEnabledPluginById(
    "templates"
  );
  if (!corePlugin) {
    console.error(
      "[Longform] Attempted to use core template plugin while disabled."
    );
    return;
  }
  // Get template body
  let contents = await app.vault.adapter.read(templatePath);

  // Replace {{date}} and {{time}}
  const dateFormat = corePlugin.options["dateFormat"] || "YYYY-MM-DD";
  const timeFormat = corePlugin.options["timeFormat"] || "HH:mm";

  contents = contents.replace(`{{date}}`, window.moment().format(dateFormat));
  contents = contents.replace(`{{time}}`, window.moment().format(timeFormat));

  return contents;
}

export type SceneWordStats = {
  scene: number;
  draft: number;
  project: number;
};

export function statsForScene(
  activeFile: TFile | null,
  draft: Draft,
  drafts: Draft[],
  counts: DraftWordCounts
): SceneWordStats | null {
  const count = counts[draft.vaultPath];
  if (!count) {
    return null;
  }

  const totalForDraft = (
    vaultPath: string,
    counts: DraftWordCounts
  ): number => {
    const count = counts[vaultPath];
    if (typeof count === "number") {
      return count;
    } else if (typeof count === "object") {
      return sum(Object.values(count));
    } else {
      return 0;
    }
  };

  const totalForProject = (
    title: string,
    drafts: Draft[],
    counts: DraftWordCounts
  ): number => {
    const draftsForProject = drafts.filter((d) => d.title === title);
    return sum(draftsForProject.map((d) => totalForDraft(d.vaultPath, counts)));
  };

  const draftTotal = totalForDraft(draft.vaultPath, counts);
  const projectTotal = totalForProject(draft.title, drafts, counts);

  if (draft.format === "single") {
    return {
      scene: draftTotal,
      draft: draftTotal,
      project: totalForProject(draft.title, drafts, counts),
    };
  } else {
    const sceneName = activeFile ? fileNameFromPath(activeFile.path) : null;
    const sceneTotal =
      sceneName && typeof count !== "number" ? count[sceneName] : 0;
    return {
      scene: sceneTotal,
      draft: draftTotal,
      project: projectTotal,
    };
  }
}
