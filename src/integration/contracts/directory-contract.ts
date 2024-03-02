import type { Directory } from "src/model/file-system";
import type IntegrationTestFramework from "../framework";

/**
 * A contract that anything implementing the {@link Directory} interface should adhere to.
 */
export function directoryContract(framework: IntegrationTestFramework) {
  const { beforeEach, describe, it } = framework;

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
            if (!note || !note.isNote) {
              throw new Error(`Expected to find note at "${fullName}"`);
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
            if (!note || !note.isNote) {
              throw new Error("Did not create path for note");
            }

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
            if (!child || !child.isDirectory || child.isNote) {
              throw new Error(
                `Expected to find directory at "${directoryName}"`
              );
            }
          });
          it(`creates parent directories at that path`, async () => {
            const parentDirectoryName = uniqueName();
            await directory.createDirectory(
              `${parentDirectoryName}/${uniqueName()}`
            );

            const child = directory.getPath(parentDirectoryName);
            if (!child) throw new Error("Did not create parent of directory");
            if (!child.isDirectory || child.isNote)
              throw new Error(
                "Created a file for the parent instead of a directory."
              );
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
            if (!child.isDirectory)
              throw new Error("Did not create directory.");
            const file = child.getPath(`${nested}/${fileName}.md`);
            if (!file || !file.isNote)
              throw new Error(
                `Expected to find file at ${subfolder}/${nested}/${fileName}.md from within ${subfolder}.  Found: ${file}`
              );
          });

          it(`communicates with parent when subpaths are created`, async () => {
            const subfolder = uniqueName();
            await directory.createDirectory(subfolder);
            const child = directory.getPath(subfolder) as Directory;

            await child.createFile("nested file.md");

            const file = directory.getPath(`${subfolder}/nested file.md`);
            if (!file.isNote)
              throw new Error("Subdirectory cannot access nested files");
          });

          it(`can access subpaths created through parent`, async () => {
            const subfolder = uniqueName();
            await directory.createDirectory(subfolder);
            const child = directory.getPath(subfolder) as Directory;

            await directory.createFile(`${subfolder}/nested file.md`);

            const file = child.getPath("nested file.md");
            if (!file.isNote)
              throw new Error("Subdirectory cannot access nested files");
          });
        });
      });
    },
  };
}
