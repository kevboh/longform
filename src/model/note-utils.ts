import { last, sum } from "lodash";
import type { App, TFile } from "obsidian";

import type { Draft, DraftWordCounts } from "./types";
import { get } from "svelte/store";
import { pluginSettings } from "./stores";

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
  app: App,
  path: string,
  index: number,
  template: string | null
): Promise<void> {
  const file = await createNote(app, path);
  if (!file) return;
  if (template) {
    let contents = "";
    let pluginUsed = "";
    try {
      if (isTemplaterEnabled(app)) {
        pluginUsed = "Templater";
        contents = await createWithTemplater(app, file, template);
      } else if (isTemplatesEnabled(app)) {
        pluginUsed = "Core Templates";
        contents = await createWithTemplates(app, template);
      }
    } catch (error) {
      console.error(`[Longform] Error using plugin [${pluginUsed}]:`, error);
    }
    if (contents !== "") {
      await app.vault.adapter.write(path, contents);
    }
  }
  if (get(pluginSettings).writeProperty) {
    await app.fileManager.processFrontMatter(file, (fm) => {
      fm["longform-order"] = index;
    });
  }
}

/**
 * Creates a note at `path` with the given `initialContent`.
 * @param path
 * @param initialContent
 * @returns `null` if it fails to create the note.  `TFile` for the new note, if successful.
 */
export async function createNote(
  app: App,
  path: string,
  initialContent = ""
): Promise<TFile | null> {
  const pathComponents = path.split("/");
  pathComponents.pop();

  if (!(await app.vault.adapter.exists(pathComponents.join("/")))) {
    try {
      await app.vault.createFolder(pathComponents.join("/"));
    } catch (e) {
      console.error(`[Longform] Failed to create new note at "${path}"`, e);
      return null;
    }
  }

  try {
    // as of obsidian 1.4.4, vault.create will successfully create a file, and
    // its parent folder, but will throw an error anyway, if the parent folder
    // didn't initially exist.  By creating the parent folder above, we avoid
    // that situation.  This may change in later versions of obsidian.
    return await app.vault.create(path, initialContent);
  } catch (e: unknown) {
    console.error(`[Longform] Failed to create new note at "${path}"`, e);
    return null;
  }
}

function isTemplaterEnabled(app: App): boolean {
  return !!(app as any).plugins.getPlugin("templater-obsidian");
}

function isTemplatesEnabled(app: App): boolean {
  return !!(app as any).internalPlugins.getEnabledPluginById("templates");
}

async function createWithTemplater(
  app: App,
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

async function createWithTemplates(
  app: App,
  templatePath: string
): Promise<string> {
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
