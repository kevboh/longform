import type { Command } from "obsidian";

import type LongformExtendedPlugin from "src/main";

export type CommandBuilder = (plugin: LongformExtendedPlugin) => Command;
