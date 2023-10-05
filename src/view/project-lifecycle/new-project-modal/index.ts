import { App, Modal, TFolder } from "obsidian";
import { insertDraftIntoFrontmatter } from "src/model/draft-utils";
import { selectedDraftVaultPath } from "src/model/stores";
import type {
  Draft,
  MultipleSceneDraft,
  SingleSceneDraft,
} from "src/model/types";
import { selectedTab } from "src/view/stores";
import NewProjectModal from "./NewProjectModal.svelte";

export default class NewProjectModalContainer extends Modal {
  private parent: TFolder;

  constructor(app: App, parent: TFolder) {
    super(app);
    this.parent = parent;
  }

  onOpen(): void {
    const { contentEl } = this;

    contentEl.createEl("h1", { text: "Create Project" }, (el) => {
      el.style.margin = "0 0 var(--size-4-4) 0";
    });
    const entrypoint = contentEl.createDiv("longform-add-create-project-root");

    const context = new Map();
    context.set("close", () => this.close());
    context.set(
      "createProject",
      async (format: "scenes" | "single", title: string, path: string) => {
        const exists = await this.app.vault.adapter.exists(path);
        if (exists) {
          console.log(
            `[Longform] Cannot create project at ${path}, already exists.`
          );
          return;
        }

        const parentPath = path.split("/").slice(0, -1).join("/");
        if (!(await this.app.vault.adapter.exists(parentPath))) {
          await this.app.vault.createFolder(parentPath);
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

        await insertDraftIntoFrontmatter(path, newDraft);
        selectedDraftVaultPath.set(path);
        selectedTab.set(format === "scenes" ? "Scenes" : "Project");
        if (format === "single") {
          this.app.workspace.openLinkText(path, "/", false);
        }
        this.close();
      }
    );

    new NewProjectModal({
      target: entrypoint,
      context,
      props: {
        parent: this.parent,
      },
    });
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
