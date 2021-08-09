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
} from "./view/stores";
import { ICON_NAME, ICON_SVG } from "./view/icon";
import { LongformSettingsTab } from "./view/settings/LongformSettings";

const LONGFORM_LEAF_CLASS = "longform-leaf";

// TODO: Try and abstract away more logic from actual plugin hooks here

export default class LongformPlugin extends Plugin {
  // Local mirror of the pluginSettings store
  // since this class does a lot of ad-hoc settings fetching.
  // More efficient than a lot of get() calls.
  cachedSettings: LongformPluginSettings;
  private unsubscribeSettings: Unsubscriber;
  private metadataObserver: IndexMetadataObserver;
  private foldersObserver: FolderObserver;
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
    this.unsubscribeSettings = pluginSettings.subscribe((value) => {
      this.cachedSettings = value;
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
    this.unsubscribeSettings();
    this.unsubscribeCurrentProjectPath();
    this.unsubscribeCurrentDraftPath();
    this.app.workspace
      .getLeavesOfType(VIEW_TYPE_LONGFORM_EXPLORER)
      .forEach((leaf) => leaf.detach());
  }

  async loadSettings(): Promise<void> {
    const settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    pluginSettings.set(settings);
    currentDraftPath.set(settings.selectedDraft);
    currentProjectPath.set(settings.selectedProject);
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.cachedSettings);
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
      const contents = indexBodyFor(EmptyIndexFileMetadata);
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
        // test
        this.cachedSettings = get(pluginSettings);
        await this.saveSettings();
      }
    );

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
        "create",
        this.foldersObserver.fileCreated.bind(this.foldersObserver)
      )
    );

    this.registerEvent(
      this.app.vault.on(
        "delete",
        this.foldersObserver.fileDeleted.bind(this.foldersObserver)
      )
    );

    this.registerEvent(
      this.app.vault.on(
        "rename",
        this.foldersObserver.fileRenamed.bind(this.foldersObserver)
      )
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
