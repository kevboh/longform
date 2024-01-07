# The Index File

The Index File is a note with a `longform` frontmatter entry. You can think of it as the “root” of a project: it tells Longform what kind of project it is, where the scenes are, and other metadata needed to make everything work.

## The `longform` Entry

The `longform` frontmatter entry is how Longform discovers, tracks, and reasons about projects. It contains the following properties:

| Name        | Type                   | Required? | Description                                                                                                                                                                                          |
| ----------- | ---------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| format      | `"single" or "scenes"` | true      | Whether this is a [single-](./SINGLE_SCENE_PROJECTS.md) or [multi-](./MULTIPLE_SCENE_PROJECTS.md) scene project.                                                                                     |
| title       | `string`               | false     | The title of the project. If multiple projects have the same title, they are treated as separate drafts of the same project. If not specified, uses the name of the index file as the project title. |
| draftNumber | `number`               | false     | If this project is one draft among many (see `title`), used to order and distinguish drafts.                                                                                                         |
| workflow    | `string`               | true      | Used by Longform to track compile state. Do not edit.                                                                                                                                                |

In addition to the above, multi-scene projects have some additional frontmatter in the `longform` entry:

| Name          | Type                          | Required? | Description                                                                                                                                            |
| ------------- | ----------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| sceneFolder   | `string`                      | true      | The path—relative to the index file—where your scenes live.                                                                                            |
| scenes        | `string[]` (array of strings) | true      | Nested arrays of scene file names (without .md extensions).                                                                                            |
| sceneTemplate | `string`                      | false     | Path to file to use as a template for newly-created scenes in this project.                                                                            |
| ignoredFiles  | `string[]` (array of strings) | false     | If present, a list of scene names (without .md extensions, wildcards are allowed) to ignore when prompting to add newly-created files to your project. |

## Other Frontmatter

You’re free to put any other frontmatter you’d like in the index file as long as that frontmatter is outside the `longform` entry. Longform will leave it alone. You might want to do this to integrate with other Obsidian plugins.
