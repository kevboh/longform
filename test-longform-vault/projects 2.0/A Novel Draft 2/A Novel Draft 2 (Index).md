---
longform:
  format: scenes
  title: A Novel; or, What Projects Look Like Now
  workflow: test
  folder: /
  scenes:
    - in this draft
  ignoredFiles: []
othermetadata: sure
---

### What is This?

This is an example of a project in Longform using the new index format. In this new format, index metadata lives at what Longform 1.0 called the "draft" level. This is for a variety of reasons:

1. It makes projects less deeply-nested inside folders.
2. It's more flexible and helps support people who don't want to use multiple drafts for a project and instead use something like git or Obsidian Sync to see drafting history.
3. It helps mitigate some sync issues, especially when creating new drafts.

Longform also now tries to be a better citizen about the actual index file, and will do its best to only mutate the frontmatter it cares about. It also leaves the _content_ of the index file alone; if you want to use this file as scratch space, a title page, a table of contents, etc., Longform will let you do that (with the caveat that it may require special handling in compile workflows if you want content here to appear in your final product).

Longform projects (again, now at the "draft" level) no longer have to be explicitly created via folders and the context menu. Instead, any note with a `longform` frontmatter entry, if valid, will be treated as something to be tracked in Longform. You are free to create stories, essays, and manuscripts from templates or user scripts as you see fit.

### Grouping Multiple Drafts

Since index data now lives at the draft level, you may be wondering how to compose multiple drafts of the same manuscript. Longform will treat drafts with the same `title` frontmatter value as belonging to the same project; if you want to make a new draft of a project, simply create one and give it the same `title` as your previous draft. They will appear grouped together as drafts always have. You are free to organize these drafts in whatever manner you choose.

### Scene Folders

Drafts have a `folder` frontmatter value that let you choose where scenes are stored relative to the index file. The default is `/`, which means that scenes will be stored in the same folder as the index file. If you prefer a file structure similar to something like:

```
My Folder/
  A Novel (Index)
  Scenes/
    Scene One
    Scene Two
```

Set `folder: Scenes/` in the index file's frontmatter.

### Migrating to This Format

If you have Longform projects in the old multi-draft format, Longform will help you migrate them to the new format. Details TK.

### Editing This File Directly

You can edit this file (the index file) directly; however, there are a couple gotchas to be aware of when doing so:

1. The frontmatter must always be valid YAML. If, for example, you directly update `longform.title` to be `Magnus Opus: a novel` without wrapping it in straight double quotes (`""`), the project will disappear from Longform, as semicolons are invalid in unquoted YAML strings. For safety, you can always wrap your title in quotes—Longform will strip them out when YAML doesn’t require them.
2. Removing the `longform` entry or altering its `format` property to be anything other than `scenes` or `single` will cause the project to disappear. Longform considers all notes with a `longform.format` entry of `scenes` or `single` to be good citizens.

You are free to edit this file, frontmatter and contents. Frontmatter outside the `longform` property will be preserved.