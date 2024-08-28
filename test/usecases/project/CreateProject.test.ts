import { possibleDraftFileCreated } from "src/model/draft";
import type { Note } from "src/model/file-system";
import { createNewProject } from "src/model/project";
import { get, writable } from "svelte/store";
import type { Draft, MultipleSceneDraft } from "src/model/types";
import { InMemoryFileSystem } from "test/notes/FakeDirectory";
import { describe, expect, it } from "vitest";

function noCache() {
  return {
    getCachedDraftByPath(path: string): Draft | null {
      return null;
    },
    cacheDraft(draft: Draft) {
      return;
    },
  };
}

const formats = ["single", "scenes"] as const;
for (const format of formats) {
  const projectType = format === "single" ? "single-scene" : "multi-scene";
  describe(`Creating a new "${projectType}" project`, () => {
    describe(`through the plugin api`, () => {
      it(`creates a new index file`, async () => {
        // Arrange
        const fileSystem = new InMemoryFileSystem();

        // Act
        const result = await createNewProject(
          fileSystem,
          {
            openNoteFileInCurrentLeaf(path) {
              return Promise.resolve();
            },
          },
          format,
          "project title",
          "/sub/directory/project title.md"
        );

        // Assert
        expect(result).toBeTruthy();

        const indexFile = fileSystem.getPath("/sub/directory/project title.md");

        expect(indexFile).toBeDefined();
        expect(indexFile.isNote).toBe(true);
      });

      it(`populates the index file frontmatter with a longform property`, async () => {
        // Arrange
        const fileSystem = new InMemoryFileSystem();

        // Act
        await createNewProject(
          fileSystem,
          {
            openNoteFileInCurrentLeaf(path) {
              return Promise.resolve();
            },
          },
          format,
          "project title",
          "/sub/directory/project title.md"
        );

        // Assert
        const indexFile = fileSystem.getPath("/sub/directory/project title.md");

        expect(indexFile).toHaveProperty("isNote", true);

        let frontmatter: Record<string, any>;
        await (indexFile as Note).modifyFrontMatter((fm) => {
          frontmatter = fm;
        });

        expect(frontmatter.longform).toHaveProperty("format", format);
        expect(frontmatter.longform).toHaveProperty("title", "project title");

        if (format === "scenes") {
          expect(frontmatter.longform).toHaveProperty("ignoredFiles", []);
          expect(frontmatter.longform).toHaveProperty("sceneFolder", "/");
          expect(frontmatter.longform).toHaveProperty("scenes", []);
        }
      });
    });

    describe(`by detecting a new index file being modified`, () => {
      it(`creates a new ${projectType} draft`, async () => {
        const fileSystem = new InMemoryFileSystem();
        const file = await fileSystem.createFile("new-project.md");
        file.modifyFrontMatter((frontmatter) => {
          frontmatter["longform"] = {
            format,
          };
        });

        const { drafts, createdDraft } = await possibleDraftFileCreated(
          fileSystem,
          noCache(),
          writable([]),
          file
        );

        expect(get(drafts)).toContainEqual(createdDraft);

        expect(createdDraft).toBeDefined();
        expect(createdDraft).toHaveProperty("format", format);
        expect(createdDraft).toHaveProperty("title", "new-project");
        expect(createdDraft).toHaveProperty("draftTitle", null);
        expect(createdDraft).toHaveProperty("vaultPath", "new-project.md");
        expect(createdDraft).toHaveProperty("workflow", null);
      });

      it(`titles the project after the title in the frontmatter`, async () => {
        const fileSystem = new InMemoryFileSystem();
        const file = await fileSystem.createFile("new-project.md");
        file.modifyFrontMatter((frontmatter) => {
          frontmatter["longform"] = {
            format,
            title: "Different Title",
          };
        });

        const { drafts, createdDraft } = await possibleDraftFileCreated(
          fileSystem,
          noCache(),
          writable([]),
          file
        );

        expect(get(drafts)).toContainEqual(createdDraft);

        expect(createdDraft).toBeDefined();
        expect(createdDraft).toHaveProperty("title", "Different Title");
      });

      it(`titles the project after the name of the file, if not provided`, async () => {
        const fileSystem = new InMemoryFileSystem();
        await fileSystem.createDirectory("subfolder/nested");
        const file = await fileSystem.createFile(
          "subfolder/nested/new-project.md"
        );
        file.modifyFrontMatter((frontmatter) => {
          frontmatter["longform"] = {
            format,
          };
        });

        const { drafts, createdDraft } = await possibleDraftFileCreated(
          fileSystem,
          noCache(),
          writable([]),
          file
        );

        expect(get(drafts)).toContainEqual(createdDraft);

        expect(createdDraft).toBeDefined();
        expect(createdDraft).toHaveProperty("title", "new-project");
        expect(createdDraft).toHaveProperty(
          "vaultPath",
          "subfolder/nested/new-project.md"
        );
      });

      if (format === "scenes") {
        function expectMultiSceneDraft(
          draft: any
        ): asserts draft is MultipleSceneDraft {
          if (draft.format !== "scenes") {
            throw new Error("Draft does not have expected format");
          }
          if (!(`scenes` in draft)) {
            throw new Error("Draft does not have 'scenes' property");
          }
        }

        it(`reads defined scene names`, async () => {
          const fileSystem = new InMemoryFileSystem();
          const file = await fileSystem.createFile("new-project.md");
          await fileSystem.createFile("Part 1.md");
          await fileSystem.createFile("Act 1.md");
          await fileSystem.createFile("Scene 1.md");
          await fileSystem.createFile("Scene 2.md");
          await fileSystem.createFile("Act 2.md");
          await fileSystem.createFile("Part 2.md");

          file.modifyFrontMatter((frontmatter) => {
            frontmatter["longform"] = {
              format,
              scenes: [
                "Part 1",
                ["Act 1", ["Scene 1", "Scene 2"], "Act 2", []],
                "Part 2",
              ],
            };
          });

          const { drafts, createdDraft } = await possibleDraftFileCreated(
            fileSystem,
            noCache(),
            writable([]),
            file
          );

          expect(get(drafts)).toContainEqual(createdDraft);

          expect(createdDraft).toBeDefined();
          expectMultiSceneDraft(createdDraft);
          expect(createdDraft.scenes).toEqual([
            { title: "Part 1", indent: 0 },
            { title: "Act 1", indent: 1 },
            { title: "Scene 1", indent: 2 },
            { title: "Scene 2", indent: 2 },
            { title: "Act 2", indent: 1 },
            { title: "Part 2", indent: 0 },
          ]);
        });

        it(`reads scenes from defined scene folder`, async () => {
          const fileSystem = new InMemoryFileSystem();
          const file = await fileSystem.createFile("new-project.md");
          await fileSystem.createDirectory("scenes");
          await fileSystem.createFile("scenes/Scene 1.md");

          file.modifyFrontMatter((frontmatter) => {
            frontmatter["longform"] = {
              format,
              sceneFolder: "scenes",
              scenes: ["Scene 1"],
            };
          });

          const { drafts, createdDraft } = await possibleDraftFileCreated(
            fileSystem,
            noCache(),
            writable([]),
            file
          );

          expect(get(drafts)).toContainEqual(createdDraft);

          expect(createdDraft).toBeDefined();
          expectMultiSceneDraft(createdDraft);
          expect(createdDraft.scenes).toEqual([
            { title: "Scene 1", indent: 0 },
          ]);
        });

        it(`collects scenes in scene folder that are not included in scene list`, async () => {
          const fileSystem = new InMemoryFileSystem();
          const file = await fileSystem.createFile("new-project.md");
          await fileSystem.createDirectory("scenes");
          await fileSystem.createFile("scenes/Scene 1.md");

          file.modifyFrontMatter((frontmatter) => {
            frontmatter["longform"] = {
              format,
              sceneFolder: "scenes",
            };
          });

          const { drafts, createdDraft } = await possibleDraftFileCreated(
            fileSystem,
            noCache(),
            writable([]),
            file
          );

          expect(get(drafts)).toContainEqual(createdDraft);

          expect(createdDraft).toBeDefined();
          expectMultiSceneDraft(createdDraft);
          expect(createdDraft.scenes).to.not.include("Scene 1");
          expect(createdDraft.unknownFiles).toEqual(["Scene 1"]);
        });
      }
    });
  });
}

describe(`when a new index file is modified`, () => {
  it(`does not create a new draft if there is no longform property`, async () => {
    const fileSystem = new InMemoryFileSystem();
    const file = await fileSystem.createFile("new-project.md");

    const { drafts, createdDraft } = await possibleDraftFileCreated(
      fileSystem,
      noCache(),
      writable([]),
      file
    );

    expect(get(drafts)).toHaveLength(0);
    expect(createdDraft).toBeNull();
  });

  it(`does not create a new draft if the format is unrecognized`, async () => {
    const fileSystem = new InMemoryFileSystem();
    const file = await fileSystem.createFile("new-project.md");
    file.modifyFrontMatter((frontmatter) => {
      frontmatter["longform"] = {
        format: "unrecognized",
      };
    });

    const { drafts, createdDraft } = await possibleDraftFileCreated(
      fileSystem,
      noCache(),
      writable([]),
      file
    );

    expect(get(drafts)).toHaveLength(0);
    expect(createdDraft).toBeNull();
  });
});
