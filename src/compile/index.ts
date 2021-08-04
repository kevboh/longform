import { normalizePath, Vault } from "obsidian";
import { get } from "svelte/store";

import { pluginSettings, projectMetadata } from "../view/stores";

export interface CompileOptions {
  includeHeaders: boolean;
  reportProgress: (status: string, complete: boolean) => void;
}

export async function compile(
  vault: Vault,
  projectPath: string,
  draftName: string,
  targetPath: string,
  options: CompileOptions
): Promise<void> {
  // Grab draft path and metadata
  const projectSettings = get(pluginSettings).projects[projectPath];
  if (!projectSettings) {
    console.error(
      `[Longform] No tracked project at ${projectPath} exists for compilation.`
    );
    return;
  }

  const scenePath = (scene: string) =>
    normalizePath(
      `${projectPath}/${projectSettings.draftsPath}/${draftName}/${scene}.md`
    );

  const draftMetadata = get(projectMetadata)[projectPath].drafts.find(
    (d) => d.folder === draftName
  );
  if (!draftMetadata) {
    console.error(
      `[Longform] No draft named ${draftName} exists in ${projectPath} for compilation.`
    );
    return;
  }

  let result = "";

  const report = (status: string, complete: boolean) => {
    console.log(`[Longform] ${status}`);
    options.reportProgress(status, complete);
  };

  for (const scene of draftMetadata.scenes) {
    const path = scenePath(scene);
    const sceneContents = await vault.adapter.read(path);
    report(`Compiling ${path}…`, false);
    if (options.includeHeaders) {
      result += `# ${scene}\n\n`;
    }
    result += `${sceneContents}\n\n`;
  }

  const finalTarget = targetPath.endsWith(".md")
    ? targetPath
    : targetPath + ".md";
  report(`Writing compile result to ${finalTarget}`, false);
  await vault.adapter.write(finalTarget, result);
  report(`Compiled ${draftName} to ${finalTarget}`, true);
}
