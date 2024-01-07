import { last } from "lodash";
import { App, normalizePath } from "obsidian";
import { writable } from "svelte/store";
import { insertDraftIntoFrontmatter } from "./draft-utils";
import { pluginSettings } from "./stores";
import {
  LONGFORM_CURRENT_PLUGIN_DATA_VERSION,
  type LongformPluginSettings,
  type MultipleSceneDraft,
} from "./types";

const INDEX_MIGRATION_NOTICE =
  "\n\nThis is a Longform 1.0 Index File, and the project it corresponded to has since been migrated. It has been marked as to-be-ignored in the new project and can be safely deleted.";

export const needsMigration = writable<boolean>(false);

export function determineMigrationStatus(settings: LongformPluginSettings) {
  needsMigration.set(settings.version < LONGFORM_CURRENT_PLUGIN_DATA_VERSION);
}

export async function migrate(settings: LongformPluginSettings, app: App) {
  if (settings.version >= LONGFORM_CURRENT_PLUGIN_DATA_VERSION) {
    console.log(
      `[Longform] Attempted to migrate settings with version ${settings.version} > current (${LONGFORM_CURRENT_PLUGIN_DATA_VERSION}); ignoring.`
    );
    return;
  }

  let currentVersion = settings.version;

  while (currentVersion < LONGFORM_CURRENT_PLUGIN_DATA_VERSION) {
    // Projects 1.0 -> Projects 2.0
    if (currentVersion === 2) {
      // for each tracked project, for each draft in each tracked project
      // convert to a projects 2.0 Draft.
      // projects with one draft lose their Drafts/Draft folder
      // projects with > 1 draft

      const projectPaths = Object.keys(settings.projects);
      for (const projectPath of projectPaths) {
        console.log(`[Longform] Migrating ${projectPath} to Projects 2.0…`);
        const project = settings.projects[projectPath];
        const normalizedProjectPath = normalizePath(projectPath);

        const indexPath = normalizePath(
          `${projectPath}/${project.indexFile}.md`
        );
        const metadata = app.metadataCache.getCache(indexPath);
        if (!metadata || !metadata.frontmatter) {
          continue;
        }
        const workflow = metadata.frontmatter["workflow"] ?? null;
        const drafts = metadata.frontmatter["drafts"] ?? [];
        const title = last(projectPath.split("/"));

        const moveScenes = async (from: string, to: string) => {
          const { files } = await app.vault.adapter.list(from);
          for (const file of files) {
            if (file.endsWith(".md")) {
              const fileName = last(file.split("/"));
              const toPath = normalizePath(`${to}/${fileName}`);
              await app.vault.adapter.rename(file, toPath);
            }
          }
        };

        try {
          await app.vault.adapter.append(indexPath, INDEX_MIGRATION_NOTICE);
        } catch (error) {
          console.log(
            `[Longform] Error appending deprecation notice to old index file`,
            error
          );
        }

        if (drafts.length === 1) {
          const oldDraft = drafts[0];
          const vaultPath = normalizePath(`${projectPath}/${title}.md`);
          const draft: MultipleSceneDraft = {
            format: "scenes",
            title,
            titleInFrontmatter: false,
            draftTitle: null,
            vaultPath,
            workflow,
            sceneFolder: "/",
            scenes: oldDraft["scenes"].map((s: string) => ({
              title: s,
              indent: 0,
            })),
            ignoredFiles: [project.indexFile],
            unknownFiles: [],
            sceneTemplate: null,
          };

          await insertDraftIntoFrontmatter(vaultPath, draft);
          await moveScenes(
            normalizePath(
              `${projectPath}/${project.draftsPath}/${oldDraft.folder}/`
            ),
            normalizedProjectPath
          );
          console.log(`[Longform] Wrote only draft to ${vaultPath}`);
        } else {
          for (const oldDraft of drafts) {
            const vaultPathParent = normalizePath(
              `${projectPath}/${oldDraft.name}/`
            );
            try {
              await app.vault.createFolder(vaultPathParent);
            } catch (error) {
              console.log(
                `[Longform] Error creating folder during migration`,
                error
              );
            }
            const vaultPath = normalizePath(
              `${vaultPathParent}/${oldDraft.name}.md`
            );
            const draft: MultipleSceneDraft = {
              format: "scenes",
              title,
              titleInFrontmatter: true,
              draftTitle: oldDraft.name,
              vaultPath,
              workflow,
              sceneFolder: "/",
              scenes: oldDraft["scenes"].map((s: string) => ({
                title: s,
                indent: 0,
              })),
              ignoredFiles: [],
              unknownFiles: [],
              sceneTemplate: null,
            };

            await insertDraftIntoFrontmatter(vaultPath, draft);
            await moveScenes(
              normalizePath(
                `${projectPath}/${project.draftsPath}/${oldDraft.folder}/`
              ),
              vaultPathParent
            );
            console.log(`[Longform] Wrote ${oldDraft.name} to ${vaultPath}`);
          }
        }
      }
    }

    currentVersion = currentVersion + 1;
  }

  pluginSettings.update((settings) => {
    settings.version = currentVersion;
    settings.projects = {};
    return settings;
  });
  needsMigration.set(false);
}
