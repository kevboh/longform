import { compileCurrent, compileSelection } from "./compile";
import {
  focusCurrentDraft,
  previousScene,
  previousSceneAtIndent,
  nextScene,
  nextSceneAtIndent,
  jumpToProject,
  showLongformExtended,
  jumpToScene,
  revealProjectFolder,
  focusNewSceneField,
} from "./navigation";
import { indentScene, unindentScene } from "./indentation";
import type LongformExtendedPlugin from "src/main";
import {
  insertMultiSceneTemplate,
  insertSingleSceneTemplate,
} from "./templates";
import { startNewSession } from "./word-counts";

const commandBuilders = [
  compileCurrent,
  compileSelection,
  focusCurrentDraft,
  previousScene,
  previousSceneAtIndent,
  nextScene,
  nextSceneAtIndent,
  indentScene,
  unindentScene,
  jumpToProject,
  jumpToScene,
  showLongformExtended,
  revealProjectFolder,
  focusNewSceneField,
  insertMultiSceneTemplate,
  insertSingleSceneTemplate,
  startNewSession,
];

export function addCommands(plugin: LongformExtendedPlugin) {
  commandBuilders.forEach((c) => {
    plugin.addCommand(c(plugin));
  });
}
