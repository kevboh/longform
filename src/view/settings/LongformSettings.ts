import { App, PluginSettingTab } from "obsidian";
import { get } from "svelte/store";

import type LongformPlugin from "../../main";
import { DEFAULT_SETTINGS } from "../../model/types";
import {
  currentDraftPath,
  currentProjectPath,
  pluginSettings,
} from "../stores";

export class LongformSettingsTab extends PluginSettingTab {
  plugin: LongformPlugin;

  constructor(app: App, plugin: LongformPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h2", { text: "Longform" });
    containerEl.createEl("p", {}, (el) => {
      el.innerHTML =
        'Longform written and maintained by <a href="https://kevinbarrett.org">Kevin Barrett</a>.';
    });
    containerEl.createEl("p", {}, (el) => {
      el.innerHTML =
        'Read the source code and report issues at <a href="https://github.com/kevboh/longform">https://github.com/kevboh/longform</a>.';
    });
    containerEl.createEl("p", {}, (el) => {
      el.innerHTML =
        'Icon made by <a href="https://www.flaticon.com/authors/zlatko-najdenovski" title="Zlatko Najdenovski">Zlatko Najdenovski</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a>.';
    });

    containerEl.createEl("hr");
    containerEl.createEl("p", {
      text: "If you find Longform to be misbehaving (logging errors in console, not syncing changes to index files) you can try resetting tracked projects. This will cause Longform to “forget” that various project folders in your vault should be watched and managed by Longform. You can then re-mark those folders as Longform projects by right-clicking them in the file explorer. You will not lose any notes.",
    });
    containerEl.createEl(
      "button",
      {
        text: "Untrack All Projects",
        title: "Click to have Longform untrack all projects.",
      },
      (el) => {
        el.classList.add("longform-settings-destructive-button");
        el.onclick = async () => {
          console.log(
            "[Longform] Resetting plugin data to: ",
            DEFAULT_SETTINGS
          );
          pluginSettings.set(DEFAULT_SETTINGS);
          currentProjectPath.set(null);
          currentDraftPath.set(null);
          this.plugin.cachedSettings = get(pluginSettings);
          await this.plugin.saveSettings();
        };
      }
    );
  }
}
