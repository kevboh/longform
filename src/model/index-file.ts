import { dump } from "js-yaml";
import {
  DraftsMetadata,
  IndexFileMetadata,
  LONGFORM_CURRENT_INDEX_VERSION,
} from "./types";

const WARNING =
  "This file is managed by Longform. Please avoid editing it directly; doing so will almost certainly confuse the plugin, and may cause a loss of data.";

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

export function indexBodyFor(state: IndexFileMetadata): string {
  const body = dump(state, { flowLevel: -1 });
  return `---\n${body}---\n\n%% ${WARNING} %%`;
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
