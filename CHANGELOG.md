# CHANGELOG

## next release

- Add command to reveal the current project in the file explorer (#130)
- Rename all commands to be sentence-case, matching rest of Obsidian
- Support templates when creating scenes (Templater, core Templates plugin) (#134)

## 2.0.3

- Correct bug in previous set of 2.0.2 fixes.

## 2.0.2

- Use new atomic frontmatter APIs (#136, #133)
- Slightly better fallbacks for null project states (#132)

## 2.0.1

- Add funding URL
- Fix #123

## 2.0.0

Total rewrite.

- Change index file format and make index file tracking discovery-based rather than the mark/unmark context menu pattern.
- Add support for nesting scenes, ignoring files and patterns, and single-scene projects.
- Add Project tab for editing index metadata.
- Add word counts and writing session count tracking to Project tab.
- Version all deps.
- Support compile for single-scene projects.

## 1.0.3

- Update the way metadata is patched, fixes [#15](https://github.com/kevboh/longform/issues/15) and possibly [#9](https://github.com/kevboh/longform/issues/9).

## 1.0.2

- Updates based on the [community plugin PR](https://github.com/obsidianmd/obsidian-releases/pull/400).

## 1.0.1

- Small refactor to make metadata sync more reliable.
- Update index file template to link to more info on how the index file works.
- Add a note about the Templater issue in the README.

## 1.0.0

Initial release.
