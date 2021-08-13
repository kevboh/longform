import { stringifyYaml } from "obsidian";
import {
  DraftsMetadata,
  IndexFileMetadata,
  LONGFORM_CURRENT_INDEX_VERSION,
} from "./types";

const WARNING = `
This file is managed by Longform. Please avoid editing it directly; doing so will almost certainly confuse the plugin, and may cause a loss of data.

Longform uses this file to organize your folders and notes into a project. For more details, please see [The Index File](https://github.com/kevboh/longform#the-index-file) section of the plugin’s README.
`;

export const EmptyIndexFileMetadata: IndexFileMetadata = {
  version: LONGFORM_CURRENT_INDEX_VERSION,
  drafts: [
    {
      name: "Draft 1",
      folder: "Draft 1",
      scenes: [],
    },
  ],
};

export function indexBodyFor(state: IndexFileMetadata): string | null {
  if (!state) {
    return null;
  }
  const body = stringifyYaml(state);
  if (!body || body === "undefined") {
    return null;
  }
  return `---\n${body}---\n\n${WARNING}\n`;
}

export function buildDraftsLookup(drafts: DraftsMetadata[]): {
  [draftsFolderName: string]: DraftsMetadata;
} {
  return drafts.reduce<{ [draftsFolderName: string]: DraftsMetadata }>(
    (agg, d) => {
      agg[d.folder] = d;
      return agg;
    },
    {}
  );
}
