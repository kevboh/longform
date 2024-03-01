import type { Directory } from "src/model/file-system";
import { beforeEach, describe, expect, it } from "vitest";

/**
 * Something implementing the {@link Directory} interface should adhere to this contract
 */
export function directoryContract(createDirectory: () => Directory) {
  describe(`directory contract`, () => {
    let directory: ReturnType<typeof createDirectory>;
    beforeEach(() => {
      directory = createDirectory();
    });

    describe("retrieving paths", () => {
      it(`does not get file that does not exist`, async () => {
        const path =
          new Date().getTime().toString() +
          "-" +
          Math.random().toString().slice(2) +
          ".md";
        expect.soft(directory.getPath(path)).toBeNull();
        expect.soft(await directory.pathExists(path)).toBeFalsy();
      });
    });

    describe("creating a note", () => {
      it(`creates the file in the directory`, async () => {
        await directory.createFile("file.md");

        expect(await directory.pathExists("file.md")).toBeTruthy();
      });

      it(`creates a nested note in the directory`, async () => {
        await directory.createDirectory("subfolder");
        await directory.createFile("subfolder/file.md");

        expect(await directory.pathExists("subfolder/file.md")).toBeTruthy();
        const note = directory.getPath("subfolder/file.md");
        if (!note || !note.isNote) {
          throw new Error("Path is not a note");
        }
      });
      it(`cannot create nested note in non-existent directory`, async () => {
        let createdNote;
        try {
          const promise = directory.createFile("subfolder/file.md");
          createdNote = await promise;
        } catch (e: unknown) {
          // threw error.  Test passed.
          return;
        }

        throw new Error(
          "Should have failed to create note.  Created " +
            JSON.stringify(createdNote)
        );
      });
    });

    describe("modifying a note's frontmatter", () => {
      it("persists the modified object", async () => {
        await directory.createFile("file.md");
        const note = directory.getPath("file.md");
        if (!note.isNote) {
          throw new Error("Did not create path for note");
        }

        note.modifyFrontMatter((frontmatter) => {
          frontmatter.foo = "bar";
          frontmatter.baz = "banana";
        });

        let frontmatter: Record<string, any> | null = null;
        note.modifyFrontMatter((savedFrontmatter) => {
          frontmatter = savedFrontmatter;
        });
        expect(frontmatter).toHaveProperty("foo", "bar");
        expect(frontmatter).toHaveProperty("baz", "banana");
      });
    });

    describe(`creating a directory`, () => {
      it(`creates a directory at that path`, async () => {
        await directory.createDirectory("subfolder");

        const child = directory.getPath("subfolder");
        if (!child.isDirectory || child.isNote) {
          throw new Error("Created path was not a directory");
        }
      });
      it(`creates parent directories at that path`, async () => {
        await directory.createDirectory("subfolder/nested");

        const child = directory.getPath("subfolder");
        expect(child).toBeDefined();
        expect.soft(child).toHaveProperty("isDirectory", true);
        expect.soft(child).toHaveProperty("isNote", false);
      });
    });

    describe(`child directory`, () => {
      it(`can access previously created paths`, async () => {
        await directory.createDirectory("subfolder/nested");
        await directory.createFile("subfolder/nested/file.md");

        const child = directory.getPath("subfolder") as Directory;

        expect(child.getPath("nested")).toHaveProperty("isDirectory", true);
        expect(child.getPath("nested/file.md")).toHaveProperty("isNote", true);
      });

      it(`communicates with parent when subpaths are created`, async () => {
        await directory.createDirectory("subfolder");
        const child = directory.getPath("subfolder") as Directory;

        await child.createFile("nested file.md");

        const file = directory.getPath("subfolder/nested file.md");
        expect(file).toHaveProperty("isNote", true);
      });

      it(`can access subpaths created through parent`, async () => {
        await directory.createDirectory("subfolder");
        const child = directory.getPath("subfolder") as Directory;

        await directory.createFile("subfolder/nested file.md");

        const file = child.getPath("nested file.md");
        expect(file).toHaveProperty("isNote", true);
      });
    });
  });
}
