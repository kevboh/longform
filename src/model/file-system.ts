
/**
 * A sub section of a larger filesystem.  All methods work with paths relative to this directory
 */
export interface Directory {
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
    createDirectory(path: string): Promise<void>;

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
}

export type Path = |
    (Directory & { isNote: false; isDirectory: true }) | 
    (Note) & { isNote: true; isDirectory: false }

export interface Note {
    modifyFrontMatter(transform: (frontmatter: Record<string, any>) => void): Promise<void>
}