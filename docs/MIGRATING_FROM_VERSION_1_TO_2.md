# Migrating from Longform 1.x to 2.0

The 2.0 version of Longform changes the format and location of [index files](./INDEX_FILE.md). It also changes what data it saves locally in plugin storage. This means that the first time you upgrade, Longform will prompt you to migrate your projects.

## Automated Migration (Recommended)

Migration does the following:

- For each project you have marked as a Longform project in 1.0 at `path/to/project-name/Index.md`:
  - Read the metadata from the index file, then delete it.
  - Check to see if it has one more more than one draft. If it has one draft:
    - Create a new index file for that draft at `path/to/project-name/project-name.md`
    - Move all scenes in that draft to `path/to/project-name/`
  - If it has more than one draft, for each draft:
    - Create a new index file for that draft at `path/to/project-name/draft-name/draft-name.md`
    - Set the draft's `title` to be `project-name`
    - Move all scenes in that draft to `path/to/project-name/draft-name/`

The result is a series of Longform 2.0 projects in roughly the same place as your 1.0 projects, with slightly less folder hierarchy in places.

Note that **only the old index files are deleted** during migration. They are no longer needed, and their metadata is no longer valid after migrating.

## Migrating Manually

It is technically possible to migrate your projects manually, if you prefer. This is not recommended, but for completeness, here is how:

1. For each draft in each project you'd like to migrate, create a note to serve as that draft’s index file and use the insert frontmatter commands to insert the relevant frontmatter.
2. If the draft has scenes, list them in the `scenes` entry, and set the `folder` entry to be the relative path to those scenes.
3. If the draft is part of a multiple-draft project, set the `title` entry to be the name of your project.
4. Finally, after you've created all your notes and have your files arranged as desired, you need to manually edit the saved data in the `.obsidian/plugins/longform/` directory of your vault.
    - Close Obsidian and open `.obsidian/plugins/longform/data.json` in a text editor. 
    - Set the `projects` JSON attribute to be `{}` so that it looks like this: `"projects": {},`
    - Set the `version` JSON attribute to be `3` so that it looks like this: `"version": 3,`
    - Save the file and exit the text editor.
    - Open Obsidian.
5. At this point Longform will count your projects as having been migrated. Check each to make sure it looks correct; if not, you likely have a file in the wrong place.
6. When you’re satisfied with your project, you can delete the old, now-unused index files.
