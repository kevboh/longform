import { App, Modal, normalizePath } from "obsidian";
import { insertDraftIntoFrontmatter } from "src/model/draft-utils";
import { scenePath, scenePathForFolder } from "src/model/scene-navigation";
import { selectedDraft, selectedDraftVaultPath } from "src/model/stores";
import type { Draft } from "src/model/types";
import { get } from "svelte/store";
import NewDraftModal from "./NewDraftModal.svelte";

export default class NewDraftModalContainer extends Modal {
  constructor(app: App) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;

    const title = get(selectedDraft).title;

    contentEl.createEl("h1", { text: `New Draft of ${title}` }, (el) => {
      el.style.margin = "0 0 var(--size-4-4) 0";
    });
    const entrypoint = contentEl.createDiv("longform-add-create-draft-root");

    const context = new Map();
    context.set("close", () => this.close());

    context.set(
      "createDraft",
      async (
        newVaultPath: string,
        draft: Draft,
        draftTitle: string,
        copyScenes: boolean
      ) => {
        if (draft.format === "single") {
          const newDraft = {
            ...draft,
            title: draft.title,
            titleInFrontmatter: true,
            draftTitle,
          };
          await insertDraftIntoFrontmatter(newVaultPath, newDraft);
          selectedDraftVaultPath.set(newVaultPath);
          this.app.workspace.openLinkText(newVaultPath, "/", false);
        } else {
          // ensure parent folder exists, if not create it
          const parentPath = newVaultPath.split("/").slice(0, -1).join("/");
          if (!(await this.app.vault.adapter.exists(parentPath))) {
            await this.app.vault.createFolder(parentPath);
          }

          if (copyScenes) {
            // copy scene notes
            const newSceneParent = normalizePath(
              `${parentPath}/${draft.sceneFolder}/`
            );
            await Promise.all(
              draft.scenes.map((scene) => {
                const path = scenePath(scene.title, draft, this.app.vault);
                const newPath = scenePathForFolder(scene.title, newSceneParent);
                return this.app.vault.adapter.copy(path, newPath);
              })
            );
          }

          // insert draft into frontmatter
          const newDraft = {
            ...draft,
            title: draft.title,
            titleInFrontmatter: true,
            draftTitle,
            scenes: copyScenes ? draft.scenes : [],
          };
          await insertDraftIntoFrontmatter(newVaultPath, newDraft);
          selectedDraftVaultPath.set(newVaultPath);
        }
        this.close();
      }
    );

    new NewDraftModal({
      target: entrypoint,
      context,
    });
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
