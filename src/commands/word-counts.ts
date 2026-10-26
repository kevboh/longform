import type { CommandBuilder } from "./types";

export const startNewSession: CommandBuilder = (plugin) => ({
  id: "longform-extended-start-new-session",
  name: "Start new writing session",
  callback: () => {
    plugin.writingSessionTracker.startNewSession();
  },
});
