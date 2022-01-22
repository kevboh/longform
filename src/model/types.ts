export const LONGFORM_CURRENT_PLUGIN_DATA_VERSION = 2;
export const LONGFORM_CURRENT_INDEX_VERSION = 1;

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
  projects: { [path: string]: LongformProjectSettings };
  selectedProject: string | null;
  selectedDraft: string | null;
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
  selectedProject: null,
  selectedDraft: null,
  workflows: null,
  userScriptFolder: null,
};

export const TRACKED_SETTINGS_PATHS = [
  "version",
  "projects",
  "selectedProject",
  "selectedDraft",
  "userScriptFolder",
];
