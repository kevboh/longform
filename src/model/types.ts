export const LONGFORM_CURRENT_PLUGIN_DATA_VERSION = 3;
export const LONGFORM_CURRENT_INDEX_VERSION = 1;

// projects 2.0

export type IndentedScene = {
  title: string;
  indent: number;
};

export type MultipleSceneDraft = {
  format: "scenes";
  title: string;
  titleInFrontmatter: boolean;
  draftTitle: string | null;
  vaultPath: string;
  workflow: string | null;
  sceneFolder: string;
  scenes: IndentedScene[];
  ignoredFiles: string[] | null;
  unknownFiles: string[];
};

export type SingleSceneDraft = {
  format: "single";
  title: string;
  titleInFrontmatter: boolean;
  draftTitle: string | null;
  vaultPath: string;
  workflow: string | null;
};

export type Draft = MultipleSceneDraft | SingleSceneDraft;

// projects 1.0

export interface DraftsMetadata {
  name: string;
  folder: string;
  scenes: string[];
}

export interface IndexFileMetadata {
  version: number;
  workflow: string | null;
  drafts: DraftsMetadata[];
}

export interface LongformProjectSettings {
  path: string;
  indexFile: string;
  draftsPath: string;
}

export type SerializedStep = {
  id: string;
  optionValues: { [id: string]: unknown };
};

export type SerializedWorkflow = {
  name: string;
  description: string;
  steps: SerializedStep[];
};

export interface LongformPluginSettings {
  version: number;
  // DEPRECATED. To be removed in future, needed now for migrations.
  projects: { [path: string]: LongformProjectSettings };
  selectedDraftVaultPath: string | null;
  workflows: Record<string, SerializedWorkflow> | null;
  userScriptFolder: string | null;
}

export enum ProjectLoadError {
  None,
  MissingMetadata = "This project’s metadata is either missing or invalid. Please check its index file. If all else fails, you can reset all project tracking in settings and re-mark folders as Longform projects.",
}

export type ProjectDetails = LongformProjectSettings &
  IndexFileMetadata & {
    error: ProjectLoadError;
  };

export const DEFAULT_SETTINGS: LongformPluginSettings = {
  version: LONGFORM_CURRENT_PLUGIN_DATA_VERSION,
  projects: {},
  selectedDraftVaultPath: null,
  workflows: null,
  userScriptFolder: null,
};

export const TRACKED_SETTINGS_PATHS = [
  "version",
  "projects",
  "selectedDraftVaultPath",
  "userScriptFolder",
];
