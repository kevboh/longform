export const LONGFORM_CURRENT_PLUGIN_DATA_VERSION = 1;
export const LONGFORM_CURRENT_INDEX_VERSION = 1;

export interface DraftsMetadata {
  name: string;
  folder: string;
  scenes: string[];
}

export interface IndexFileMetadata {
  version: number;
  drafts: DraftsMetadata[];
}

export interface LongformProjectSettings {
  path: string;
  indexFile: string;
  draftsPath: string;
}

export interface LongformPluginSettings {
  version: number;
  projects: { [path: string]: LongformProjectSettings };
  selectedProject: string | null;
  selectedDraft: string | null;
}

export interface ProjectFolderContents {
  [projectPath: string]: {
    [draftName: string]: string[];
  };
}

export type ProjectDetails = LongformProjectSettings & IndexFileMetadata;

export const DEFAULT_SETTINGS: LongformPluginSettings = {
  version: LONGFORM_CURRENT_PLUGIN_DATA_VERSION,
  projects: {},
  selectedProject: null,
  selectedDraft: null,
};
