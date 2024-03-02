import { TFile, type App, normalizePath, TFolder } from "obsidian";
import type { Directory, Note, Path } from "src/model/file-system";

/**
 * Hides the obsidian api behind the {@link Directory} interface for testing
 */
export class VaultDirectory implements Directory {
  constructor(private readonly app: App) {}

  get name() {
    return "";
  }

  get path() {
    return "";
  }

  pathExists(path: string): Promise<boolean> {
    return this.app.vault.adapter.exists(normalizePath(path));
  }

  async createDirectory(path: string): Promise<TFolderDirectory> {
    try {
      const tFolder = await this.app.vault.createFolder(normalizePath(path));
      return new TFolderDirectory(this.app, tFolder);
    } catch (e) {
      let nestedMessage: string;
      if (e instanceof Error) {
        nestedMessage = e.message;
      } else {
        nestedMessage = `${e}`;
      }
      throw new Error("Failed to create directory " + nestedMessage);
    }
  }

  async createFile(path: string, content: string = ""): Promise<TFileNote> {
    try {
      const tfile = await this.app.vault.create(normalizePath(path), content);
      return new TFileNote(tfile, this.app);
    } catch (e) {
      let nestedMessage: string;
      if (e instanceof Error) {
        nestedMessage = e.message;
      } else {
        nestedMessage = `${e}`;
      }
      throw new Error("Failed to create file " + nestedMessage);
    }
  }

  getPath(path: string): Path {
    const file = this.app.vault.getAbstractFileByPath(normalizePath(path));
    if (file instanceof TFile) {
      return new TFileNote(file, this.app);
    } else if (file instanceof TFolder) {
      return new TFolderDirectory(this.app, file);
    } else {
      return null;
    }
  }

  async list(subfolderPath?: string): Promise<{
    readonly files: readonly string[];
    readonly folders: readonly string[];
  }> {
    return this.app.vault.adapter.list(normalizePath(subfolderPath ?? "/"));
  }
}

class TFileNote implements Note {
  get isNote(): true {
    return true;
  }
  get isDirectory(): false {
    return false;
  }

  constructor(public file: TFile, private app: App) {}

  get path(): string {
    return this.file.path;
  }

  get name(): string {
    return this.file.name;
  }

  getMetadata(): { readonly frontmatter?: Record<string, any> } {
    return this.app.metadataCache.getFileCache(this.file);
  }

  modifyFrontMatter(
    transform: (frontmatter: Record<string, any>) => void
  ): Promise<void> {
    return this.app.fileManager.processFrontMatter(this.file, transform);
  }
}

class TFolderDirectory implements Directory {
  get isDirectory(): true {
    return true;
  }
  get isNote(): false {
    return false;
  }

  constructor(private readonly app: App, private readonly tfolder: TFolder) {
    this.pathExists = app.vault.adapter.exists.bind(app.vault.adapter);
  }

  get path(): string {
    return this.tfolder.path;
  }

  get name(): string {
    return this.tfolder.name;
  }

  pathExists(path: string): Promise<boolean> {
    return this.app.vault.adapter.exists(
      normalizePath(this.tfolder.path + path)
    );
  }
  async createDirectory(path: string): Promise<TFolderDirectory> {
    return new TFolderDirectory(
      this.app,
      await this.app.vault.createFolder(
        normalizePath(this.tfolder.path + "/" + path)
      )
    );
  }

  async createFile(path: string, content: string = ""): Promise<Note> {
    const tfile = await this.app.vault.create(
      normalizePath(this.tfolder.path + "/" + path),
      content
    );
    return new TFileNote(tfile, this.app);
  }

  getPath(path: string): Path {
    const file = this.app.vault.getAbstractFileByPath(
      normalizePath(this.tfolder.path + "/" + path)
    );
    if (file instanceof TFile) {
      return new TFileNote(file, this.app);
    } else if (file instanceof TFolder) {
      return new TFolderDirectory(this.app, file);
    } else {
      return null;
    }
  }

  list(subfolderPath?: string): Promise<{
    readonly files: readonly string[];
    readonly folders: readonly string[];
  }> {
    return Promise.resolve({
      files: [],
      folders: [],
    });
  }
}
