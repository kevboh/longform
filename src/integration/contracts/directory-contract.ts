import type {
  Directory,
  DirectoryPath,
  NotePath,
  Path,
} from "src/model/file-system";
import type IntegrationTestFramework from "../framework";

/**
 * A contract that anything implementing the {@link Directory} interface should adhere to.
 */
export function directoryContract(framework: IntegrationTestFramework) {
  const { beforeEach, describe, it } = framework;

  function expectNote(
    path: Path | null,
    message?: string
  ): asserts path is NotePath {
    if (!path) {
      throw new Error(`Expected note to be defined.  ` + (message ?? ""));
    }
    if (!path.isNote || path.isDirectory) {
      throw new Error(
        `Expected to find note, but found directory.  ` + (message ?? "")
      );
    }
  }

  function expectDirectory(
    path: Path | null,
    message?: string
  ): asserts path is DirectoryPath {
    if (!path) {
      throw new Error(`Expected directory to be defined.  ` + (message ?? ""));
    }
    if (!path.isDirectory || path.isNote) {
      throw new Error(
        `Expected to find directory, but found note.  ` + (message ?? "")
      );
    }
  }

  return {
    test(factory: () => Directory, pathNamePrefix: string = "") {
      describe(`directory contract`, () => {
        let directory: Directory;
        beforeEach(() => {
          directory = factory();
        });

        let count = 0;
        function uniqueName() {
          count++;
          return (
            pathNamePrefix +
            Math.random().toString(36).slice(2) +
            "-" +
            count.toString()
          );
        }

        describe("retrieving paths", () => {
          it(`does not get file that does not exist`, async () => {
            const path = `${uniqueName()}.md`;

            const file = directory.getPath(path);
            if (file != null) {
              throw new Error(`Expected not to find file at "${path}"`);
            }
            if (await directory.pathExists(path)) {
              throw new Error(`Expected file at "${path}" not to exist`);
            }
          });
        });

        describe("creating a note", () => {
          it(`creates the file in the directory`, async () => {
            const fileName = uniqueName();
            await directory.createFile(`${fileName}.md`);

            if (!(await directory.pathExists(`${fileName}.md`))) {
              throw new Error(`Expected to find file at "${fileName}.md"`);
            }
            const note = directory.getPath(`${fileName}.md`);
            expectNote(note, `${fileName}.md`);
            if (note.path !== `${fileName}.md`) {
              throw new Error(
                `Expected created note to have path "${fileName}.md" but found "${note.path}"`
              );
            }
          });

          it(`creates a nested note in the directory`, async () => {
            const folderName = uniqueName();
            const fileName = uniqueName();
            await directory.createDirectory(folderName);
            const fullName = `${folderName}/${fileName}.md`;
            await directory.createFile(fullName);

            if (!(await directory.pathExists(fullName))) {
              throw new Error(`Expected "${fullName}" to exist.`);
            }
            const note = directory.getPath(fullName);
            expectNote(note, fullName);
            if (note.path !== fullName) {
              throw new Error(
                `Expected created note to have path "${fullName}", found "${note.path}"`
              );
            }
          });
          it(`cannot create nested note in non-existent directory`, async () => {
            const folderName = uniqueName();
            const fileName = uniqueName();
            const fullPath = `${folderName}/${fileName}.md`;
            let createdNote;
            try {
              const promise = directory.createFile(fullPath);
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
            const fileName = `${uniqueName()}.md`;
            await directory.createFile(fileName);
            const note = directory.getPath(fileName);
            expectNote(note, fileName);

            await note.modifyFrontMatter((frontmatter) => {
              frontmatter.foo = "bar";
              frontmatter.baz = "banana";
            });

            let frontmatter: Record<string, any> | null = null;
            await note.modifyFrontMatter((savedFrontmatter) => {
              frontmatter = savedFrontmatter;
            });
            if (!frontmatter) {
              throw new Error("Frontmatter never received.");
            }
            if (frontmatter.foo !== "bar") {
              throw new Error("Incorrectly set frontmatter.");
            }
            if (frontmatter.baz !== "banana") {
              throw new Error("Incorrectly set frontmatter.");
            }
          });
        });

        describe(`creating a directory`, () => {
          it(`creates a directory at that path`, async () => {
            const directoryName = uniqueName();
            await directory.createDirectory(directoryName);

            const child = directory.getPath(directoryName);
            expectDirectory(child);
          });
          it(`creates parent directories at that path`, async () => {
            const parentDirectoryName = uniqueName();
            await directory.createDirectory(
              `${parentDirectoryName}/${uniqueName()}`
            );

            expectDirectory(directory.getPath(parentDirectoryName));
          });
        });

        describe(`listing child paths`, () => {
          it(`lists immediate children`, async () => {
            const files = [
              await directory.createFile(uniqueName() + ".md"),
              await directory.createFile(uniqueName() + ".md"),
              await directory.createFile(uniqueName() + ".md"),
            ];
            const folders = [
              await directory.createDirectory(uniqueName()),
              await directory.createDirectory(uniqueName()),
              await directory.createDirectory(uniqueName()),
            ];

            const list = await directory.list();

            for (const file of files) {
              if (!list.files.includes(file.path)) {
                throw new Error(
                  `Expected list of files to include all child files.`
                );
              }
              if (list.folders.includes(file.path)) {
                throw new Error(
                  `Should not include folders in list of child files.`
                );
              }
            }
            for (const folder of folders) {
              if (!list.folders.includes(folder.path)) {
                throw new Error(
                  `Expected list of folders to include all child folders.`
                );
              }
              if (list.files.includes(folder.path)) {
                throw new Error(
                  `Should not include files in list of child folders.`
                );
              }
            }
          });
        });

        describe(`listing paths in subdirectory`, () => {
          it(`lists paths relative to this directory`, async () => {
            const subfolder = await directory.createDirectory(uniqueName());
            const files = [
              await subfolder.createFile(uniqueName() + ".md"),
              await subfolder.createFile(uniqueName() + ".md"),
              await subfolder.createFile(uniqueName() + ".md"),
            ];
            const folders = [
              await subfolder.createDirectory(uniqueName()),
              await subfolder.createDirectory(uniqueName()),
              await subfolder.createDirectory(uniqueName()),
            ];

            const list = await directory.list(subfolder.path);

            for (const file of files) {
              if (file.path !== `${subfolder.path}/${file.name}`) {
                throw new Error(
                  `File path should be relative to root directory.`
                );
              }
              if (!list.files.includes(file.path)) {
                throw new Error(
                  `Expected list of files to include all child files.`
                );
              }
              if (list.folders.includes(file.path)) {
                throw new Error(
                  `Should not include folders in list of child files.`
                );
              }
            }
            for (const folder of folders) {
              if (folder.path !== `${subfolder.path}/${folder.name}`) {
                throw new Error(
                  `Folder path should be relative to root directory.`
                );
              }
              if (!list.folders.includes(folder.path)) {
                throw new Error(
                  `Expected list of folders to include all child folders.`
                );
              }
              if (list.files.includes(folder.path)) {
                throw new Error(
                  `Should not include files in list of child folders.`
                );
              }
            }
          });
        });

        describe(`child directory`, () => {
          it(`can access previously created paths`, async () => {
            const subfolder = uniqueName();
            const nested = uniqueName();
            const fileName = uniqueName();
            await directory.createDirectory(`${subfolder}/${nested}`);
            await directory.createFile(`${subfolder}/${nested}/${fileName}.md`);

            const child = directory.getPath(subfolder);
            expectDirectory(child);
            const file = child.getPath(`${nested}/${fileName}.md`);
            expectNote(file);
          });

          it(`communicates with parent when subpaths are created`, async () => {
            const subfolder = uniqueName();
            await directory.createDirectory(subfolder);
            const child = directory.getPath(subfolder) as Directory;

            await child.createFile("nested file.md");

            const file = directory.getPath(`${subfolder}/nested file.md`);
            expectNote(file);
          });

          it(`can access subpaths created through parent`, async () => {
            const subfolder = uniqueName();
            await directory.createDirectory(subfolder);
            const child = directory.getPath(subfolder) as Directory;

            await directory.createFile(`${subfolder}/nested file.md`);

            const file = child.getPath("nested file.md");
            expectNote(file);
          });
        });
      });
    },
  };
}
