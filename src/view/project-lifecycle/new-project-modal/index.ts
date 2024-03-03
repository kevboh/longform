import { App, Modal, TFolder } from "obsidian";
import NewProjectModal from "./NewProjectModal.svelte";
import { appContext } from "src/view/utils";
import { createNewProject } from "src/model/project";
import { VaultDirectory } from "src/utils/VaultDirectory";

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

    const context = appContext(this);
    context.set("close", () => this.close());
    context.set(
      "createProject",
      async (format: "scenes" | "single", title: string, path: string) => {
        const createNewProjectInObsidian = createNewProject.bind(
          null,
          new VaultDirectory(this.app),
          {
            openNoteFileInCurrentLeaf: (path) => {
              return this.app.workspace.openLinkText(path, "/", false);
            },
          }
        );

        if (await createNewProjectInObsidian(format, title, path)) {
          this.close();
        }
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
