import { selectedTab } from "src/view/tabs";
import { selectedDraftVaultPath } from "./stores";
import type { Draft, MultipleSceneDraft, SingleSceneDraft } from "./types";
import type { Directory } from "./file-system";
import { insertDraftIntoFrontmatter } from "./draft";

interface Workspace {
  /**
   * @param path the path of the note file, relative to the vault open in the workspace.
   */
  openNoteFileInCurrentLeaf(path: string): Promise<void>;
}

/**
 * @param format "scenes" indicates a multi-scene project.  "single" indicates a project with a single scene.
 * @param title the new title of the project
 * @param path a path normalized to the root of the vault
 * @returns `true` if successful, `false` otherwise
 */
export async function createNewProject(
  fileSystem: Directory,
  workspace: Workspace,
  format: "scenes" | "single",
  title: string,
  path: string
): Promise<boolean> {
  const exists = await fileSystem.pathExists(path);
  if (exists) {
    console.log(`[Longform] Cannot create project at ${path}, already exists.`);
    return false;
  }

  const parentPath = path.split("/").slice(0, -1).join("/");
  if (!(await fileSystem.pathExists(parentPath))) {
    await fileSystem.createDirectory(parentPath);
  }

  const newDraft: Draft = (() => {
    if (format === "scenes") {
      const multi: MultipleSceneDraft = {
        format: "scenes",
        title,
        titleInFrontmatter: true,
        draftTitle: null,
        vaultPath: path,
        workflow: null,
        sceneFolder: "/",
        scenes: [],
        ignoredFiles: [],
        unknownFiles: [],
        sceneTemplate: null,
      };
      return multi;
    } else {
      const single: SingleSceneDraft = {
        format: "single",
        title,
        titleInFrontmatter: true,
        draftTitle: null,
        vaultPath: path,
        workflow: null,
      };
      return single;
    }
  })();

  await insertDraftIntoFrontmatter(fileSystem, path, newDraft);
  selectedDraftVaultPath.set(path);
  selectedTab.set(format === "scenes" ? "Scenes" : "Project");
  if (format === "single") {
    workspace.openNoteFileInCurrentLeaf(path);
  }
  return true;
}
