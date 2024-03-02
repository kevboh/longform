import type { Directory, Note, Path } from "src/model/file-system";

export class FakeDirectory implements Directory {
  get isNote(): false {
    return false;
  }
  get isDirectory(): true {
    return true;
  }
  constructor(
    public readonly path: string = "",
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
    if (!path.includes("/")) {
      return this.children.has(path);
    }
    return !!this.recursivelyGetPath(path.split("/"), 0);
  }

  private recursivelyGetPath(
    parts: string[],
    index: number
  ): null | FakeDirectory | (Note & { isNote: true; isDirectory: false }) {
    if (index >= parts.length) {
      return null;
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
      immediatePath
    );
    this.children.set(immediatePath, directory);
    return directory;
  }

  private recursivelyCreateDirectoryPath(
    parts: string[],
    index: number
  ): Promise<Directory> {
    if (index >= parts.length) {
      throw new Error("");
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
      return Promise.resolve(child);
    }

    return child.recursivelyCreateDirectoryPath(parts, index + 1);
  }

  createDirectory(path: string): Promise<Directory> {
    if (path.includes("/")) {
      const parts = path.split("/");
      return this.recursivelyCreateDirectoryPath(parts, 0);
    }
    const directory = new FakeDirectory(this.childPath(path), path);
    this.children.set(path, directory);
    return Promise.resolve(directory);
  }

  createFile(path: string, content?: string): Promise<Note> {
    if (path.includes("/")) {
      const parts = path.split("/");
      const parentParts = parts.slice(0, -1);
      const parent = this.recursivelyGetPath(parentParts, 0);
      if (!parent) {
        return Promise.reject(
          new Error(`Directory "${parentParts.join("/")}" does not exist.`)
        );
      }

      if (!parent.isDirectory) {
        return Promise.reject(new Error(`Cannot create file inside file.`));
      }

      return parent.createFile(parts[parts.length - 1], content);
    }

    const frontmatter: Record<string, any> = {};

    const note = {
      modifyFrontMatter(transform: (frontmatter: Record<string, any>) => void) {
        transform(frontmatter);
        return Promise.resolve();
      },
      getMetadata() {
        return {
          frontmatter,
        };
      },
      path: this.childPath(path),
      name: path,
      isNote: true as const,
      isDirectory: false as const,
    };
    this.children.set(path, note);

    return Promise.resolve(note);
  }

  getPath(path: string): Path | null {
    if (!path.includes("/")) {
      return this.children.get(path) ?? null;
    }
    return this.recursivelyGetPath(path.split("/"), 0);
  }

  list(subfolderPath?: string): Promise<{
    readonly files: readonly string[];
    readonly folders: readonly string[];
  }> {
    if (subfolderPath) {
      const path = this.recursivelyGetPath(subfolderPath.split("/"), 0);
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
}

export class InMemoryFileSystem extends FakeDirectory {
  constructor() {
    super("", "");
  }
}
