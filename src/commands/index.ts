import {
  focusCurrentDraft,
  previousScene,
  previousSceneAtIndent,
  nextScene,
  nextSceneAtIndent,
  jumpToProject,
  showLongform,
  jumpToScene,
} from "./navigation";
import { indentScene, unindentScene } from "./indentation";
import type LongformPlugin from "src/main";
import {
  insertMultiSceneTemplate,
  insertSingleSceneTemplate,
} from "./templates";
import { startNewSession } from "./word-counts";

const commandBuilders = [
  focusCurrentDraft,
  previousScene,
  previousSceneAtIndent,
  nextScene,
  nextSceneAtIndent,
  indentScene,
  unindentScene,
  jumpToProject,
  jumpToScene,
  showLongform,
  insertMultiSceneTemplate,
  insertSingleSceneTemplate,
  startNewSession,
];

export function addCommands(plugin: LongformPlugin) {
  commandBuilders.forEach((c) => {
    plugin.addCommand(c(plugin));
  });
}
