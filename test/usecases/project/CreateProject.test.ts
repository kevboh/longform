import { possibleDraftFileCreated } from "src/model/draft";
import type { Note } from "src/model/file-system";
import { createNewProject } from "src/model/project";
import { get } from "svelte/store";
import type { Draft } from "src/model/types";
import { InMemoryFileSystem } from "test/notes/FakeDirectory";
import { describe, expect, it } from "vitest";

describe("Creating a new project", () => {
  const formats = ["single", "scenes"] as const;
  describe("through the plugin api", () => {
    for (const format of formats) {
      it(`creates a new index file for ${format} project`, async () => {
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

      it(`populates the frontmatter of the new index file with longform ${format} properties`, async () => {
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
    }
  });

  describe(`by a new index file being detected`, () => {
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

    it(`does nothing if the file does not have a longform property`, async () => {
      const fileSystem = new InMemoryFileSystem();
      const file = await fileSystem.createFile("new-project.md");

      const { drafts, createdDraft } = await possibleDraftFileCreated(
        fileSystem,
        noCache(),
        file
      );

      expect(get(drafts)).toHaveLength(0);
      expect(createdDraft).toBeNull();
    });

    it(`does not create a new draft if format is unrecognized`, async () => {
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
        file
      );

      expect(get(drafts)).toHaveLength(0);
      expect(createdDraft).toBeNull();
    });

    for (const format of formats) {
      it(`adds a new draft to the drafts store with format ${format}`, async () => {
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
          file
        );

        expect(get(drafts)).toContainEqual(createdDraft);

        expect(createdDraft).toBeDefined();
        expect(createdDraft).toHaveProperty("format", format);
        expect(createdDraft).toHaveProperty("title", "new-project");
        expect(createdDraft).toHaveProperty("titleInFrontmatter", false);
        expect(createdDraft).toHaveProperty("draftTitle", null);
        expect(createdDraft).toHaveProperty("vaultPath", "new-project.md");
        expect(createdDraft).toHaveProperty("workflow", null);
      });
    }
  });
});
