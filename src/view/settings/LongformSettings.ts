import { App, PluginSettingTab, Setting } from "obsidian";
import type { Unsubscriber } from "svelte/store";
import { get } from "svelte/store";

import type LongformPlugin from "../../main";
import { pluginSettings, userScriptSteps } from "src/model/stores";
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
    const settings = get(pluginSettings);

    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl).setName("Compile").setHeading();

    new Setting(containerEl)
      .setName("User script step folder")
      .setDesc(
        ".js files in this folder will be available as User Script Steps in the Compile panel."
      )
      .addSearch((cb) => {
        new FolderSuggest(this.app, cb.inputEl);
        cb.setPlaceholder("my/script/steps/")
          .setValue(settings.userScriptFolder)
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

    new Setting(containerEl).setName("Word Counts & Sessions").setHeading();
    new Setting(containerEl)
      .setName("Show word counts in status bar")
      .setDesc("Click the status item to show the focused note’s project.")
      .addToggle((cb) => {
        cb.setValue(settings.showWordCountInStatusBar);
        cb.onChange((value) => {
          pluginSettings.update((s) => ({
            ...s,
            showWordCountInStatusBar: value,
          }));
        });
      });
    new Setting(containerEl)
      .setName("Start new writing sessions each day")
      .setDesc(
        "You can always manually start a new session by running the Longform: Start New Writing Session command. Turning this off will cause writing sessions to carry over across multiple days until you manually start a new one."
      )
      .addToggle((cb) => {
        cb.setValue(settings.startNewSessionEachDay);
        cb.onChange((value) => {
          pluginSettings.update((s) => ({
            ...s,
            startNewSessionEachDay: value,
          }));
        });
      });
    new Setting(containerEl)
      .setName("Session word count goal")
      .setDesc("A number of words to target for a given writing session.")
      .addText((cb) => {
        cb.setValue(settings.sessionGoal.toString());
        cb.onChange((value) => {
          const numberValue = +value;
          if (numberValue && numberValue > 0) {
            pluginSettings.update((s) => ({ ...s, sessionGoal: numberValue }));
          }
        });
      });
    new Setting(containerEl)
      .setName("Goal applies to")
      .setDesc(
        "You can set your word count goal to target all Longform writing, or you can make each project or scene have its own discrete goal."
      )
      .addDropdown((cb) => {
        cb.addOption("all", "words written across all projects");
        cb.addOption("project", "each project individually");
        cb.addOption("note", "each scene or single-scene project");
        cb.setValue(settings.applyGoalTo);
        cb.onChange((value: "all" | "project" | "note") => {
          pluginSettings.update((s) => ({ ...s, applyGoalTo: value }));
        });
      });
    new Setting(containerEl)
      .setName("Notify on goal reached")
      .addToggle((cb) => {
        cb.setValue(settings.notifyOnGoal);
        cb.onChange((value) => {
          pluginSettings.update((s) => ({ ...s, notifyOnGoal: value }));
        });
      });
    new Setting(containerEl)
      .setName("Count deletions against goal")
      .setDesc(
        "If on, deleting words will count as negative words written. You cannot go below zero for a session."
      )
      .addToggle((cb) => {
        cb.setValue(settings.countDeletionsForGoal);
        cb.onChange((value) => {
          pluginSettings.update((s) => ({
            ...s,
            countDeletionsForGoal: value,
          }));
        });
      });
    new Setting(containerEl)
      .setName("Sessions to keep")
      .setDesc("Number of sessions to store locally.")
      .addText((cb) => {
        cb.setValue(settings.keepSessionCount.toString());
        cb.onChange((value) => {
          const numberValue = +value;
          if (numberValue && numberValue > 0) {
            pluginSettings.update((s) => ({
              ...s,
              keepSessionCount: numberValue,
            }));
          }
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
