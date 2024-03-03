/**
 * A sub section of a larger filesystem.  All methods work with paths relative to this directory
 */
export interface Directory {
  readonly path: string;
  readonly name: string;
  readonly parent: Directory | null;

  /**
   *
   * @param path the path from the root of this directory
   *
   * @returns {Promise<boolean>} `true` if something exists at the specified, `false` otherwise
   */
  pathExists(path: string): Promise<boolean>;

  /**
   *
   * @param path the path from the root of this directory
   *
   * @throws IO error if the sub directory could not be created.
   */
  createDirectory(path: string): Promise<Directory>;

  /**
   *
   * @param path the path from the root of this directory
   * @param content (optional)
   *
   * @throws IO error if the file could not be created.
   */
  createFile(path: string, content?: string): Promise<Note>;

  /**
   *
   * @param path the path from the root of this directory
   *
   * @returns the path object at this location, or `null` if nothing exists there.
   */
  getPath(path: string): Path | null;

  /**
   * Lists all the files and folders as paths relative to this directory.  If a subfolderPath is provided, will list all the files and folders in that subfolder as paths relative to THIS directory.
   * @param subfolderPath (optional) the path of a subfolder within this directory to list the files and folders from.
   */
  list(subfolderPath?: string): Promise<{
    readonly files: readonly string[];
    readonly folders: readonly string[];
  }>;
}

export type NotePath = Note & { isNote: true; isDirectory: false };
export type DirectoryPath = Directory & { isNote: false; isDirectory: true };

export type Path = DirectoryPath | NotePath;

export interface Note {
  readonly path: string;
  readonly name: string;
  readonly parent: Directory | null;

  getMetadata(): { readonly frontmatter?: Record<string, any> };

  modifyFrontMatter(
    transform: (frontmatter: Record<string, any>) => void
  ): Promise<void>;
}
