import {
  App,
  debounce,
  normalizePath,
  PluginSettingTab,
  Setting,
} from "obsidian";
import type { Unsubscriber } from "svelte/store";
import { get } from "svelte/store";

import type LongformPlugin from "../../main";
import { pluginSettings, userScriptSteps } from "src/model/stores";
import { FolderSuggest } from "./folder-suggest";
import { DEFAULT_SESSION_FILE } from "src/model/types";
import { FileSuggest } from "./file-suggest";

export class LongformSettingsTab extends PluginSettingTab {
  plugin: LongformPlugin;
  private unsubscribeUserScripts: Unsubscriber;
  private unsubscribeSettings: Unsubscriber;
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

    new Setting(containerEl).setName("Composition").setHeading();
    new Setting(containerEl).setName("New scene template").addSearch((cb) => {
      new FileSuggest(this.app, cb.inputEl);
      cb.setPlaceholder("templates/Scene.md")
        .setValue(settings.sceneTemplate)
        .onChange((v) => {
          pluginSettings.update((s) => ({
            ...s,
            sceneTemplate: v,
          }));
        });
    });
    containerEl.createEl("p", { cls: "setting-item-description" }, (el) => {
      el.innerHTML =
        "This file will be used as a template when creating new scenes via the New Scene… field. If you use a templating plugin (Templater or the core plugin) it will be used to process this template. This setting applies to all projects and can be overridden per-project in the Project > Project Metadata settings in the Longform pane.";
    });

    new Setting(containerEl)
      .setName("Show scene numbers in Scenes tab")
      .setDesc(
        "If on, shows numbers for scenes with subscenes separated by periods, e.g. 1.1.2. Create subscenes by dragging a scene to an indent under an existing scene, or us an indent command."
      )
      .addToggle((cb) => {
        cb.setValue(settings.numberScenes);
        cb.onChange((value) => {
          pluginSettings.update((s) => ({
            ...s,
            numberScenes: value,
          }));
        });
      });

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
      .setName("Display session word count above goal")
      .setDesc("Shows the word count for that session even if it is above the goal.")
      .addToggle((cb) => {
        cb.setValue(settings.displaySessionWordsAboveGoal);
        cb.onChange((value) => {
          pluginSettings.update((s) => ({ ...s, displaySessionWordsAboveGoal: value }));
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
    new Setting(containerEl)
      .setName("Store session data")
      .setDesc(
        "Where your writing session data is stored. By default, data is stored alongside other Longform settings in the plugin’s data.json file. You may instead store it in a separate .json file in the plugin folder, or in a file in your vault. You may want to do this for selective sync or git reasons."
      )
      .addDropdown((cb) => {
        cb.addOption("data", "with Longform settings");
        cb.addOption(
          "plugin-folder",
          "as a .json file in the longform/ plugin folder"
        );
        cb.addOption("file", "as a file in your vault");
        cb.setValue(settings.sessionStorage);
        cb.onChange((value: "data" | "plugin-folder" | "file") => {
          pluginSettings.update((s) => ({ ...s, sessionStorage: value }));
        });
      });

    const updateSessionFile = debounce((value: string) => {
      // Normalize file to end in .json
      let fileName = value;
      if (!fileName || fileName.length === 0) {
        fileName = DEFAULT_SESSION_FILE;
      }
      fileName = normalizePath(fileName);
      if (!fileName.endsWith(".json")) {
        fileName = `${fileName}.json`;
      }
      pluginSettings.update((s) => ({ ...s, sessionFile: fileName }));
    }, 1000);

    const sessionFileStorageSettings = new Setting(containerEl)
      .setName("Session storage file")
      .setDesc(
        "Location in your vault to store session JSON. Created if does not exist, overwritten if it does."
      )
      .addText((cb) => {
        cb.setPlaceholder(DEFAULT_SESSION_FILE);
        cb.setValue(settings.sessionFile ?? DEFAULT_SESSION_FILE);
        cb.onChange(updateSessionFile);
      });
    sessionFileStorageSettings.settingEl.style.display = "none";

    this.unsubscribeSettings = pluginSettings.subscribe((settings) => {
      sessionFileStorageSettings.settingEl.style.display =
        settings.sessionStorage === "file" ? "flex" : "none";
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
    this.unsubscribeSettings();
  }
}
