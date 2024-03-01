import type { Directory, Note, Path } from "src/model/file-system";

export class FakeDirectory implements Directory {
  get isNote(): false {
    return false;
  }
  get isDirectory(): true {
    return true;
  }
  constructor(
    private readonly path: string = "",
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

  private createDirectoryChild(immediatePath: string) {
    const directory = new FakeDirectory(immediatePath);
    this.children.set(immediatePath, directory);
    return directory;
  }

  private recursivelyCreateDirectoryPath(parts: string[], index: number) {
    if (index >= parts.length) return;
    const name = parts[index];
    const existingChild = this.children.get(name);
    if (!existingChild) {
      this.createDirectoryChild(name).recursivelyCreateDirectoryPath(
        parts,
        index + 1
      );
      return;
    }
    if (!existingChild.isDirectory) {
      throw new Error("Cannot create directory as child of note.");
    }

    existingChild.createDirectory(parts.slice(index).join("/"));
  }

  createDirectory(path: string): Promise<void> {
    if (path.includes("/")) {
      const parts = path.split("/");
      this.recursivelyCreateDirectoryPath(parts, 0);
      return;
    }
    const directory = new FakeDirectory(path);
    this.children.set(path, directory);
    return Promise.resolve();
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

    const metadata: Record<string, any> = {};

    const note = {
      modifyFrontMatter(transform: (frontmatter: Record<string, any>) => void) {
        transform(metadata);
        return Promise.resolve();
      },
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

  deletePath(path: string): Promise<void> {
    this.children.delete(path);
    return Promise.resolve();
  }
}

export class InMemoryFileSystem extends FakeDirectory {
  constructor() {
    super();
  }
}
