import type { Command } from "obsidian";

import type LongformPlugin from "src/main";

export type CommandBuilder = (plugin: LongformPlugin) => Command;
