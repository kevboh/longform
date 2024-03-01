import { App, Modal, TFile, TFolder } from "obsidian";
import NewProjectModal from "./NewProjectModal.svelte";
import { appContext } from "src/view/utils";
import { createNewProject } from "src/model/project";
import type { Directory, Path, Note } from "src/model/file-system";

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

class VaultDirectory implements Directory {
  constructor(private readonly app: App) {
    this.pathExists = app.vault.adapter.exists.bind(app.vault.adapter);
    this.createDirectory = app.vault.createFolder.bind(app.vault);
  }

  pathExists: (path: string) => Promise<boolean>;
  createDirectory: (path: string) => Promise<void>;

  async createFile(path: string, content: string = ""): Promise<Note> {
    const tfile = await this.app.vault.create(path, content);
    return {
      modifyFrontMatter: (transform) => {
        return this.app.fileManager.processFrontMatter(tfile, transform);
      },
    };
  }

  getPath(path: string): Path {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      return {
        isNote: true,
        isDirectory: false,
        modifyFrontMatter: (transform) => {
          return this.app.fileManager.processFrontMatter(file, transform);
        },
      };
    } else {
      return new SubDirectory(this.app, path);
    }
  }
}

class SubDirectory implements Directory {
  get isDirectory(): true {
    return true;
  }
  get isNote(): false {
    return false;
  }

  constructor(private readonly app: App, private readonly path: string) {
    this.pathExists = app.vault.adapter.exists.bind(app.vault.adapter);
    this.createDirectory = app.vault.createFolder.bind(app.vault);
  }

  pathExists(path: string): Promise<boolean> {
    return this.app.vault.adapter.exists(this.path + path);
  }
  createDirectory(path: string): Promise<void> {
    return this.app.vault.createFolder(this.path + path);
  }

  async createFile(path: string, content: string = ""): Promise<Note> {
    const tfile = await this.app.vault.create(this.path + path, content);
    return {
      modifyFrontMatter: (transform) => {
        return this.app.fileManager.processFrontMatter(tfile, transform);
      },
    };
  }

  getPath(path: string): Path {
    const file = this.app.vault.getAbstractFileByPath(this.path + path);
    if (file instanceof TFile) {
      return {
        isNote: true,
        isDirectory: false,
        modifyFrontMatter: (transform) => {
          return this.app.fileManager.processFrontMatter(file, transform);
        },
      };
    } else {
      return new SubDirectory(this.app, this.path + path);
    }
  }
}
