import { TFile, type App } from "obsidian";
import type { Directory, Note, Path } from "src/model/file-system";

/**
 * Hides the obsidian api behind the {@link Directory} interface for testing
 */
export class VaultDirectory implements Directory {
  constructor(private readonly app: App) {
    this.pathExists = app.vault.adapter.exists.bind(app.vault.adapter);
  }

  pathExists: (path: string) => Promise<boolean>;
  async createDirectory(path: string) {
    await this.app.vault.createFolder(path);
  }

  async createFile(path: string, content: string = ""): Promise<Note> {
    const tfile = await this.app.vault.create(path, content);
    return new TFileNote(tfile, this.app);
  }

  getPath(path: string): Path {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof TFile) {
      return new TFileNote(file, this.app);
    } else {
      return new SubDirectory(this.app, path);
    }
  }
}

class TFileNote implements Note {
  get isNote(): true {
    return true;
  }
  get isDirectory(): false {
    return false;
  }

  constructor(private file: TFile, private app: App) {}

  modifyFrontMatter(
    transform: (frontmatter: Record<string, any>) => void
  ): Promise<void> {
    return this.app.fileManager.processFrontMatter(this.file, transform);
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
  }

  pathExists(path: string): Promise<boolean> {
    return this.app.vault.adapter.exists(this.path + path);
  }
  async createDirectory(path: string): Promise<void> {
    this.app.vault.createFolder(this.path + path);
  }

  async createFile(path: string, content: string = ""): Promise<Note> {
    const tfile = await this.app.vault.create(this.path + path, content);
    return new TFileNote(tfile, this.app);
  }

  getPath(path: string): Path {
    const file = this.app.vault.getAbstractFileByPath(this.path + path);
    if (file instanceof TFile) {
      return new TFileNote(file, this.app);
    } else {
      return new SubDirectory(this.app, this.path + path);
    }
  }
}
