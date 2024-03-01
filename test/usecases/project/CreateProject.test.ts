import type { Note } from "src/model/file-system";
import { createNewProject } from "src/model/project";
import { InMemoryFileSystem } from "test/notes/FakeDirectory";
import { describe, expect, it } from "vitest";

describe("Creating a new project", () => {
  describe("through the plugin api", () => {
    const formats = ["single", "scenes"] as const;

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
});
