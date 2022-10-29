# Word Counts & Writing Sessions

Longform includes a set of tools to help you count the number of words in your projects and to track your writing sessions as you work toward some number of written words.

## Word Counts for Projects, Drafts, and Scenes

Word counts are tracked per project, draft, and scene. You can always check your word counts in the Project tab, and if you turn on the `Show word counts in status bar` setting the word count for the currently-focused project, if applicable, will be shown in the status bar. For performance reasons, word counts are updated on a delay.

The status bar count will show scene (if a multi-scene project) and draft word counts for the given focused pane. Clicking it will show the Project tab of the corresponding project. If the scene and draft have the same number of words, only the draft count will be shown to save space.

## Writing Sessions and Word Count Goals

Longform also includes support for writing sessions. Sessions are some length of time in which you are writing against a word count goal. Longform will notify you when you’ve hit your goal. This behavior is customizable via a number of settings.

## Session Storage

By default, the data comprising your sessions is stored in the same file as other plugin settings. This can be changed via settings to store data in a dedicated `.json` file in the settings folder _or_ in a `.json` file somewhere in your vault; you might want to do this if you’d like to keep your session data per-device via `.gitignore`, for example.
