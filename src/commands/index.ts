import {
  focusCurrentDraft,
  previousScene,
  previousSceneAtIndent,
  nextScene,
  nextSceneAtIndent,
  jumpToProject,
  showLongform,
} from "./navigation";
import { indentScene, unindentScene } from "./indentation";
import type LongformPlugin from "src/main";
import {
  insertMultiSceneTemplate,
  insertSingleSceneTemplate,
} from "./templates";

const commandBuilders = [
  focusCurrentDraft,
  previousScene,
  previousSceneAtIndent,
  nextScene,
  nextSceneAtIndent,
  indentScene,
  unindentScene,
  jumpToProject,
  showLongform,
  insertMultiSceneTemplate,
  insertSingleSceneTemplate,
];

export function addCommands(plugin: LongformPlugin) {
  commandBuilders.forEach((c) => {
    plugin.addCommand(c(plugin));
  });
}
