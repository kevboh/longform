import { possibleDraftFileCreated } from "src/model/draft";
import type { Note } from "src/model/file-system";
import { createNewProject } from "src/model/project";
import { get, writable } from "svelte/store";
import type { Draft } from "src/model/types";
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
        expect(createdDraft).toHaveProperty("titleInFrontmatter", false);
        expect(createdDraft).toHaveProperty("draftTitle", null);
        expect(createdDraft).toHaveProperty("vaultPath", "new-project.md");
        expect(createdDraft).toHaveProperty("workflow", null);
      });
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
