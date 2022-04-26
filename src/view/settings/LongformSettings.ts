import { App, PluginSettingTab, Setting } from "obsidian";
import type { Unsubscriber } from "svelte/store";
import { get } from "svelte/store";

import type LongformPlugin from "../../main";
import { DEFAULT_SETTINGS } from "../../model/types";
import {
  pluginSettings,
  selectedDraftVaultPath,
  userScriptSteps,
} from "src/model/stores";
import { FolderSuggest } from "./folder-suggest";

export class LongformSettingsTab extends PluginSettingTab {
  plugin: LongformPlugin;
  private unsubscribeUserScripts: Unsubscriber;
  private stepsSummary: HTMLElement;
  private stepsList: HTMLUListElement;

  constructor(app: App, plugin: LongformPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl).setName("User Script Steps").setHeading();

    new Setting(containerEl)
      .setName("User Script Step Folder")
      .setDesc(
        ".js files in this folder will be available as User Script Steps in the Compile panel."
      )
      .addSearch((cb) => {
        new FolderSuggest(this.app, cb.inputEl);
        cb.setPlaceholder("my/script/steps/")
          .setValue(get(pluginSettings).userScriptFolder)
          .onChange((v) => {
            pluginSettings.update((s) => ({
              ...s,
              userScriptFolder: v,
            }));
          });
      });

    this.stepsSummary = containerEl.createSpan();
    this.stepsList = containerEl.createEl("ul", {
      cls: "longform-settings-user-steps",
    });
    this.unsubscribeUserScripts = userScriptSteps.subscribe((steps) => {
      if (steps && steps.length > 0) {
        this.stepsSummary.innerText = `Loaded ${steps.length} step${
          steps.length !== 1 ? "s" : ""
        }:`;
      } else {
        this.stepsSummary.innerText = "No steps loaded.";
      }
      if (this.stepsList) {
        this.stepsList.empty();
        if (steps) {
          steps.forEach((s) => {
            const stepEl = this.stepsList.createEl("li");
            stepEl.createSpan({
              text: s.description.name,
              cls: "longform-settings-user-step-name",
            });
            stepEl.createSpan({
              text: `(${s.description.canonicalID})`,
              cls: "longform-settings-user-step-id",
            });
          });
        }
      }
    });
    containerEl.createEl("p", { cls: "setting-item-description" }, (el) => {
      el.innerHTML =
        "User Script Steps are automatically loaded from this folder. Changes to .js files in this folder are synced with Longform after a slight delay. If your script does not appear here or in the Compile tab, you may have an error in your script—check the dev console for it.";
    });

    new Setting(containerEl).setName("Debugging").setHeading();

    new Setting(containerEl)
      .setDesc(
        "Removes all projects from Longform. Useful for debugging issues. No notes will be lost."
      )
      .addButton((cb) => {
        cb.setButtonText("Untrack All Projects")
          .setWarning()
          .onClick(async () => {
            console.log(
              "[Longform] Resetting plugin data to: ",
              DEFAULT_SETTINGS
            );
            pluginSettings.set(DEFAULT_SETTINGS);
            selectedDraftVaultPath.set(null);
            this.plugin.cachedSettings = get(pluginSettings);
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl).setName("Credits").setHeading();

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
  }

  hide(): void {
    this.unsubscribeUserScripts();
  }
}
