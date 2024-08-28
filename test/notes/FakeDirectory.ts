import type { Directory, Note, NotePath, Path } from "src/model/file-system";

export class FakeDirectory implements Directory {
  get isNote(): false {
    return false;
  }
  get isDirectory(): true {
    return true;
  }
  constructor(
    public readonly path: string = "",
    public readonly parent: FakeDirectory | null,
    public readonly name: string,
    private readonly children: Map<
      string,
      FakeDirectory | (Note & { isNote: true; isDirectory: false })
    > = new Map()
  ) {}

  pathExists(path: string): Promise<boolean> {
    return Promise.resolve(this.pathExistsSync(path));
  }

  private pathExistsSync(path: string): boolean {
    return !!this.getPath(path);
  }

  private recursivelyGetPath(
    parts: string[],
    index: number
  ): null | FakeDirectory | (Note & { isNote: true; isDirectory: false }) {
    if (index >= parts.length) {
      return this;
    }
    const name = parts[index];
    const child = this.children.get(name);
    if (!child) {
      return null;
    }

    if (index === parts.length - 1) {
      return child;
    }

    if (!child.isDirectory) {
      return null;
    }

    return child.recursivelyGetPath(parts, index + 1);
  }

  private childPath(path: string) {
    if (this.path.length > 0) {
      return this.path + "/" + path;
    }
    return path;
  }

  private createDirectoryChild(immediatePath: string) {
    const directory = new FakeDirectory(
      this.childPath(immediatePath),
      this,
      immediatePath
    );
    this.children.set(immediatePath, directory);
    return directory;
  }

  private recursivelyCreateDirectoryPath(
    parts: string[],
    index: number
  ): FakeDirectory {
    if (index >= parts.length) {
      return this;
    }
    const name = parts[index];
    let child = this.children.get(name);
    if (!child) {
      child = this.createDirectoryChild(name);
    }
    if (!child.isDirectory) {
      throw new Error("Cannot create directory as child of note.");
    }

    if (index === parts.length - 1) {
      return child;
    }

    return child.recursivelyCreateDirectoryPath(parts, index + 1);
  }

  createDirectory(path: string): Promise<Directory> {
    const parts = this.breakPathIntoParts(path);
    if (parts.length === 0) {
      return Promise.reject(new Error("Invalid directory path."));
    }
    const parentParts = parts.slice(0, -1);
    const parent = this.recursivelyCreateDirectoryPath(parentParts, 0);
    return Promise.resolve(
      parent.createDirectoryChild(parts[parts.length - 1])
    );
  }

  createFile(path: string, content?: string): Promise<Note> {
    const parts = this.breakPathIntoParts(path);
    if (parts.length === 0) {
      return Promise.reject(new Error("Invalid path"));
    }
    const parentParts = parts.slice(0, -1);
    const parent = this.recursivelyGetPath(parentParts, 0);
    if (!parent) {
      return Promise.reject(
        new Error(`Directory ${parentParts.join("/")} does not exist.`)
      );
    }
    if (!parent.isDirectory) {
      return Promise.reject(new Error("Cannot create file inside file."));
    }
    return Promise.resolve(
      parent.createChildFile(parts[parts.length - 1], content)
    );
  }

  private createChildFile(name: string, content?: string) {
    const frontmatter: Record<string, any> = {};
    const note: NotePath = {
      modifyFrontMatter(transform) {
        transform(frontmatter);
        return Promise.resolve();
      },
      getMetadata() {
        return {
          frontmatter,
        };
      },
      path: this.childPath(name),
      name,
      parent: this,
      isNote: true,
      isDirectory: false,
    };
    this.children.set(name, note);
    return note;
  }

  getPath(path: string): Path | null {
    const parts = this.breakPathIntoParts(path);
    if (parts.length === 0) {
      return this;
    }
    return this.recursivelyGetPath(parts, 0);
  }

  list(subfolderPath?: string): Promise<{
    readonly files: readonly string[];
    readonly folders: readonly string[];
  }> {
    if (subfolderPath) {
      const parts = this.breakPathIntoParts(subfolderPath);
      if (parts.length === 0) {
        return this.list();
      }
      const path = this.recursivelyGetPath(parts, 0);
      if (!path) {
        throw new Error("No directory found at " + subfolderPath);
      }
      if (path.isDirectory) {
        return path.list();
      } else {
        throw new Error("Cannot list children of file");
      }
    }

    return Promise.resolve({
      files: Array.from(this.children.values())
        .filter((entry) => entry.isNote)
        .map((entry) => entry.path),
      folders: Array.from(this.children.values())
        .filter((entry) => entry.isDirectory)
        .map((entry) => entry.path),
    });
  }

  deletePath(path: string): Promise<void> {
    this.children.delete(path);
    return Promise.resolve();
  }

  private breakPathIntoParts(path: string) {
    return path.split("/").filter((part) => part.length > 0);
  }
}

export class InMemoryFileSystem extends FakeDirectory {
  constructor() {
    super("", null, "");
  }
}
