import type { CommandBuilder } from "./types";

export const startNewSession: CommandBuilder = (plugin) => ({
  id: "longform-start-new-session",
  name: "Start New Writing Session",
  callback: () => {
    plugin.writingSessionTracker.startNewSession();
  },
});
