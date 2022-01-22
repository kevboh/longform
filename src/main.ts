import {
  Plugin,
  WorkspaceLeaf,
  TAbstractFile,
  Notice,
  normalizePath,
  FileView,
  addIcon,
  TFolder,
} from "obsidian";
import debounce from "lodash/debounce";
import pick from "lodash/pick";
import { get, Unsubscriber } from "svelte/store";
import {
  VIEW_TYPE_LONGFORM_EXPLORER,
  ExplorerPane,
} from "./view/explorer/ExplorerPane";
import AddProjectModal from "./view/AddProjectModal";
import {
  LongformProjectSettings,
  DEFAULT_SETTINGS,
  LongformPluginSettings,
  SerializedWorkflow,
  TRACKED_SETTINGS_PATHS,
} from "./model/types";
import {
  addProject,
  removeProject,
  isLongformProject,
  isInLongformProject,
} from "./model/project";
import { EmptyIndexFileMetadata, indexBodyFor } from "./model/index-file";
import { IndexMetadataObserver } from "./model/metadata-observer";
import { FolderObserver } from "./model/folder-observer";
import {
  activeFile,
  currentDraftPath,
  currentProjectPath,
  initialized,
  pluginSettings,
  userScriptSteps,
  workflows,
} from "./view/stores";
import { ICON_NAME, ICON_SVG } from "./view/icon";
import { LongformSettingsTab } from "./view/settings/LongformSettings";
import {
  deserializeWorkflow,
  serializeWorkflow,
} from "./compile/serialization";
import { Workflow, DEFAULT_WORKFLOWS } from "./compile";
import { UserScriptObserver } from "./model/user-script-observer";

const LONGFORM_LEAF_CLASS = "longform-leaf";

// TODO: Try and abstract away more logic from actual plugin hooks here

export default class LongformPlugin extends Plugin {
  // Local mirror of the pluginSettings store
  // since this class does a lot of ad-hoc settings fetching.
  // More efficient than a lot of get() calls.
  cachedSettings: LongformPluginSettings | null = null;
  private unsubscribeSettings: Unsubscriber;
  private unsubscribeWorkflows: Unsubscriber;
  private metadataObserver: IndexMetadataObserver;
  private foldersObserver: FolderObserver;
  private userScriptObserver: UserScriptObserver;
  private unsubscribeCurrentProjectPath: Unsubscriber;
  private unsubscribeCurrentDraftPath: Unsubscriber;

  async onload(): Promise<void> {
    console.log(`[Longform] Starting Longform ${this.manifest.version}…`);
    addIcon(ICON_NAME, ICON_SVG);

    this.registerView(
      VIEW_TYPE_LONGFORM_EXPLORER,
      (leaf: WorkspaceLeaf) => new ExplorerPane(leaf)
    );

    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file: TAbstractFile) => {
        if (!(file instanceof TFolder)) {
          return;
        }
        if (isLongformProject(file.path, this.cachedSettings)) {
          menu.addItem((item) => {
            item
              .setTitle(`Unmark as Longform Project`)
              .setIcon(ICON_NAME)
              .onClick(async () => {
                pluginSettings.update((settings): LongformPluginSettings => {
                  return removeProject(file.path, settings);
                });
                // this.settings = removeProject(file.path, this.settings);
                await this.saveSettings();
                new Notice(`${file.path} is no longer a Longform project.`);
              });
          });
        } else {
          menu.addItem((item) => {
            item
              .setTitle(`Mark as Longform Project`)
              .setIcon(ICON_NAME)
              .onClick(async () => {
                this.promptToAddProject(file.path);
              });
          });
        }
      })
    );

    // Settings
    this.unsubscribeSettings = pluginSettings.subscribe(async (value) => {
      let shouldSave = false;
      if (
        this.cachedSettings &&
        this.cachedSettings.userScriptFolder !== value.userScriptFolder
      ) {
        shouldSave = true;
      }

      this.cachedSettings = value;

      if (shouldSave) {
        await this.saveSettings();
      }
    });

    await this.loadSettings();
    this.addSettingTab(new LongformSettingsTab(this.app, this));

    this.app.workspace.onLayoutReady(this.postLayoutInit.bind(this));

    // Track active file
    activeFile.set(this.app.workspace.getActiveFile());
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", (leaf) => {
        if (leaf.view instanceof FileView) {
          activeFile.set(leaf.view.file);
        }
      })
    );

    this.addCommand({
      id: "longform-show-view",
      name: "Open Longform Pane",
      callback: () => {
        this.initLeaf();
        const leaf = this.app.workspace
          .getLeavesOfType(VIEW_TYPE_LONGFORM_EXPLORER)
          .first();
        if (leaf) {
          this.app.workspace.revealLeaf(leaf);
        }
      },
    });

    // Dynamically style longform scenes
    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        this.app.workspace.getLeavesOfType("markdown").forEach((leaf) => {
          if (leaf.view instanceof FileView) {
            if (isInLongformProject(leaf.view.file.path, this.cachedSettings)) {
              leaf.view.containerEl.classList.add(LONGFORM_LEAF_CLASS);
            } else {
              leaf.view.containerEl.classList.remove(LONGFORM_LEAF_CLASS);
            }
          }

          // @ts-ignore
          const leafId = leaf.id;
          if (leafId) {
            leaf.view.containerEl.dataset.leafId = leafId;
          }
        });
      })
    );
  }

  onunload(): void {
    this.metadataObserver.destroy();
    this.foldersObserver.destroy();
    this.userScriptObserver.destroy();
    this.unsubscribeSettings();
    this.unsubscribeCurrentProjectPath();
    this.unsubscribeCurrentDraftPath();
    this.unsubscribeWorkflows();
    this.app.workspace
      .getLeavesOfType(VIEW_TYPE_LONGFORM_EXPLORER)
      .forEach((leaf) => leaf.detach());
  }

  async loadSettings(): Promise<void> {
    const settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

    const _pluginSettings: LongformPluginSettings = pick(
      settings,
      TRACKED_SETTINGS_PATHS
    ) as LongformPluginSettings;
    pluginSettings.set(_pluginSettings);
    currentDraftPath.set(_pluginSettings.selectedDraft);
    currentProjectPath.set(_pluginSettings.selectedProject);

    // We load user scripts imperatively first to cover cases where we need to deserialize
    // workflows that may contain them.
    const userScriptFolder = settings["userScriptFolder"];
    this.userScriptObserver = new UserScriptObserver(
      this.app.vault,
      userScriptFolder
    );
    await this.userScriptObserver.loadUserSteps();

    let _workflows = settings["workflows"];

    if (!_workflows) {
      console.log("[Longform] No workflows found; adding default workflow.");
      _workflows = DEFAULT_WORKFLOWS;
    }

    const deserializedWorkflows: Record<string, Workflow> = {};
    Object.entries(_workflows).forEach(([key, value]) => {
      deserializedWorkflows[key as string] = deserializeWorkflow(value);
    });
    workflows.set(deserializedWorkflows);
  }

  async saveSettings(): Promise<void> {
    if (!this.cachedSettings) {
      return;
    }

    const _workflows = get(workflows);
    const serializedWorkflows: Record<string, SerializedWorkflow> = {};
    Object.entries(_workflows).forEach(([key, value]) => {
      serializedWorkflows[key as string] = serializeWorkflow(value);
    });

    await this.saveData({
      ...this.cachedSettings,
      workflows: serializedWorkflows,
    });
  }

  promptToAddProject(path: string): void {
    const modal = new AddProjectModal(this.app, this, path);
    modal.open();
  }

  async markPathAsProject(
    path: string,
    project: LongformProjectSettings
  ): Promise<void> {
    // Conditionally create index file and drafts folder
    const indexFilePath = normalizePath(`${path}/${project.indexFile}.md`);
    let indexFile = this.app.vault.getAbstractFileByPath(indexFilePath);
    if (!indexFile) {
      let contents = indexBodyFor(EmptyIndexFileMetadata);
      if (!contents) {
        console.error("[Longform] Unable to initialize index file.");
        contents = "";
      }
      indexFile = await this.app.vault.create(indexFilePath, contents);
    }

    const draftsFolderPath = normalizePath(`${path}/${project.draftsPath}`);
    const draftsFolder = this.app.vault.getAbstractFileByPath(draftsFolderPath);
    if (!draftsFolder) {
      await this.app.vault.createFolder(draftsFolderPath);
      const defaultDrafts = EmptyIndexFileMetadata.drafts;
      if (defaultDrafts.length > 0) {
        const firstDraftFolderName = defaultDrafts[0].folder;
        const firstDraftFolderPath = normalizePath(
          `${draftsFolderPath}/${firstDraftFolderName}`
        );
        await this.app.vault.createFolder(firstDraftFolderPath);
      }
    }

    // Add to tracked projects
    pluginSettings.update((settings): LongformPluginSettings => {
      return addProject(path, project, settings);
    });
    await this.saveSettings();

    this.foldersObserver.loadProjects();

    // If this is the only project, make it current
    const projects = Object.keys(get(pluginSettings).projects);
    if (projects.length === 1) {
      currentProjectPath.set(projects[0]);
    }

    new Notice(`${path} is now a Longform project.`);
  }

  private postLayoutInit(): void {
    this.metadataObserver = new IndexMetadataObserver(this.app);
    this.foldersObserver = new FolderObserver(this.app);
    this.userScriptObserver.beginObserving();
    this.watchProjects();
    this.unsubscribeCurrentProjectPath = currentProjectPath.subscribe(
      async (selectedProject) => {
        if (!get(initialized)) {
          return;
        }
        pluginSettings.update((s) => ({ ...s, selectedProject }));
        // Force cached settings update immediately for save to work
        this.cachedSettings = get(pluginSettings);
        await this.saveSettings();
      }
    );
    this.unsubscribeCurrentDraftPath = currentDraftPath.subscribe(
      async (selectedDraft) => {
        if (!get(initialized)) {
          return;
        }
        pluginSettings.update((s) => ({ ...s, selectedDraft }));
        // Force cached settings update immediately for save to work
        this.cachedSettings = get(pluginSettings);
        await this.saveSettings();
      }
    );

    // Workflows
    const saveWorkflows = debounce(() => {
      this.saveSettings();
    }, 3000);
    this.unsubscribeWorkflows = workflows.subscribe(() => {
      if (!get(initialized)) {
        return;
      }

      saveWorkflows();
    });

    this.initLeaf();
    initialized.set(true);
  }

  private initLeaf(): void {
    if (
      this.app.workspace.getLeavesOfType(VIEW_TYPE_LONGFORM_EXPLORER).length
    ) {
      return;
    }
    this.app.workspace.getLeftLeaf(false).setViewState({
      type: VIEW_TYPE_LONGFORM_EXPLORER,
    });
  }

  private watchProjects(): void {
    this.foldersObserver.loadProjects();

    this.registerEvent(
      this.app.vault.on(
        "modify",
        this.userScriptObserver.fileEventCallback.bind(this.userScriptObserver)
      )
    );

    this.registerEvent(
      this.app.vault.on("create", (file) => {
        this.foldersObserver.fileCreated.bind(this.foldersObserver)(file);
        this.userScriptObserver.fileEventCallback.bind(this.userScriptObserver)(
          file
        );
      })
    );

    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        this.foldersObserver.fileDeleted.bind(this.foldersObserver)(file);
        this.userScriptObserver.fileEventCallback.bind(this.userScriptObserver)(
          file
        );
      })
    );

    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        this.foldersObserver.fileRenamed.bind(this.foldersObserver)(
          file,
          oldPath
        );
        this.userScriptObserver.fileEventCallback.bind(this.userScriptObserver)(
          file
        );
      })
    );

    this.registerEvent(
      this.app.metadataCache.on(
        "changed",
        this.metadataObserver.metadataCacheChanged.bind(this.metadataObserver)
      )
    );

    console.log(`[Longform] Loaded and watching projects.`);
  }
}
