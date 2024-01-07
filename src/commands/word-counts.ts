import type { CommandBuilder } from "./types";

export const startNewSession: CommandBuilder = (plugin) => ({
  id: "longform-start-new-session",
  name: "Start new writing session",
  callback: () => {
    plugin.writingSessionTracker.startNewSession();
  },
});
