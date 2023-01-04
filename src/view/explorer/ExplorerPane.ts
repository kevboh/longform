import {
  ItemView,
  type KeymapContext,
  Menu,
  TAbstractFile,
  WorkspaceLeaf,
  type PaneType,
} from "obsidian";
import type { CompileStatus, Workflow } from "src/compile";
import { compile, CompileStepKind } from "src/compile";
import type { Draft, MultipleSceneDraft } from "src/model/types";
import AddStepModal from "../compile/add-step-modal";
import ConfirmActionModal from "../ConfirmActionModal";
import { ICON_NAME } from "../icon";
import ExplorerView from "./ExplorerView.svelte";
import { scenePath } from "src/model/scene-navigation";
import { migrate } from "src/model/migration";
import { get } from "svelte/store";
import { drafts, pluginSettings, selectedDraft } from "src/model/stores";
import { insertScene } from "src/model/draft-utils";
import NewDraftModal from "src/view/project-lifecycle/new-draft-modal";
import { UndoManager } from "../undo/undo-manager";

export const VIEW_TYPE_LONGFORM_EXPLORER = "VIEW_TYPE_LONGFORM_EXPLORER";

export class ExplorerPane extends ItemView {
  private explorerView: ExplorerView;
  private undoManager = new UndoManager();

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_LONGFORM_EXPLORER;
  }

  getDisplayText(): string {
    return "Longform";
  }

  getIcon(): string {
    return ICON_NAME;
  }

  async onOpen(): Promise<void> {
    this.registerScopeEvent(
      this.app.scope.register(
        ["Mod"],
        "z",
        (evt: KeyboardEvent, ctx: KeymapContext) => {
          const activePane = app.workspace.getActiveViewOfType(ExplorerPane);
          if (activePane === this) {
            this.undoManager.send("undo", evt, ctx);
            return false;
          }
          return true;
        }
      )
    );

    this.registerScopeEvent(
      this.app.scope.register(
        ["Mod", "Shift"],
        "z",
        (evt: KeyboardEvent, ctx: KeymapContext) => {
          const activePane = app.workspace.getActiveViewOfType(ExplorerPane);
          if (activePane === this) {
            this.undoManager.send("redo", evt, ctx);
            return false;
          }
          return true;
        }
      )
    );

    const context = new Map();

    context.set("undoManager", this.undoManager);

    // Context function for showing a generic confirmation modal
    context.set(
      "showConfirmModal",
      (
        title: string,
        description: string,
        yesText: string,
        yesAction: () => void,
        noText: string = undefined,
        noAction: () => void = undefined
      ) => {
        new ConfirmActionModal(
          this.app,
          title,
          description,
          yesText,
          yesAction,
          noText,
          noAction
        ).open();
      }
    );

    // Create a fully-qualified path to a scene from its name.
    context.set(
      "makeScenePath",
      (draft: MultipleSceneDraft, sceneName: string) =>
        scenePath(sceneName, draft, this.app.vault)
    );

    // Context function for opening scene notes on click
    context.set(
      "onSceneClick",
      (path: string, paneType: PaneType | boolean) => {
        this.app.workspace.openLinkText(path, "/", paneType);
      }
    );

    // Context function for creating new scene notes given a path
    context.set("onNewScene", async (name: string) => {
      await insertScene(
        drafts,
        get(selectedDraft) as MultipleSceneDraft,
        name,
        this.app.vault,
        { at: "end", relativeTo: null },
        async (path) => {
          await this.app.vault.create(path, "");
          this.app.workspace.openLinkText(path, "/", false);
        }
      );
    });

    // Context function for creating new draft folders given a path
    context.set(
      "onNewDraft",
      async (path: string, copying?: { from: string; to: string }[]) => {
        if (copying) {
          await this.app.vault.createFolder(path);
          // do copy
          for (const toCopy of copying) {
            await this.app.vault.adapter.copy(toCopy.from, toCopy.to);
          }
        } else {
          await this.app.vault.createFolder(path);
        }
      }
    );

    const addRelativeScene = (at: "before" | "after", file: TAbstractFile) => {
      const draft = get(selectedDraft) as MultipleSceneDraft;
      let sceneName = "Untitled";
      let count = 0;
      const sceneNames = new Set(draft.scenes.map((s) => s.title));
      while (sceneNames.has(sceneName)) {
        count = count + 1;
        sceneName = `Untitled ${count}`;
      }

      const relativeTo = draft.scenes
        .map((s) => s.title)
        .indexOf(file.name.split(".md")[0]);

      if (relativeTo >= 0) {
        insertScene(
          drafts,
          draft,
          sceneName,
          this.app.vault,
          { at, relativeTo },
          async (path) => {
            await this.app.vault.create(path, "");
            this.app.workspace.openLinkText(path, "/", false);
          }
        );
      }
    };

    // Context function for showing a right-click menu
    context.set(
      "onContextClick",
      (path: string, x: number, y: number, onRename: () => void) => {
        const file = this.app.vault.getAbstractFileByPath(path);
        if (!file) {
          return;
        }
        const menu = new Menu();
        menu.addItem((item) => {
          item.setTitle("Rename");
          item.setIcon("pencil");
          item.onClick(onRename);
        });
        menu.addItem((item) => {
          item.setTitle("Delete");
          item.setIcon("trash");
          item.onClick(async () => {
            if (file) {
              await this.app.vault.trash(file, true);
            }
          });
        });
        menu.addItem((item) => {
          item.setTitle("Open in new pane");
          item.setIcon("vertical-split");
          item.onClick(() => this.app.workspace.openLinkText(path, "/", true));
        });
        menu.addItem((item) => {
          item.setTitle("Add new scene above");
          item.setIcon("document");
          item.onClick(() => addRelativeScene("before", file));
        });
        menu.addItem((item) => {
          item.setTitle("Add new scene below");
          item.setIcon("document");
          item.onClick(() => addRelativeScene("after", file));
        });
        // Triggering this event lets other apps insert menu items
        // including Obsidian, giving us lots of stuff for free.
        this.app.workspace.trigger("file-menu", menu, file, "longform");
        menu.showAtPosition({ x, y });
      }
    );
    context.set("showDraftMenu", (x: number, y: number, action: () => void) => {
      const menu = new Menu();
      menu.addItem((item) => {
        item.setTitle("Rename");
        item.setIcon("pencil");
        item.onClick(action);
      });
      menu.showAtPosition({ x, y });
    });
    context.set("renameFolder", (oldPath: string, newPath: string) => {
      this.app.vault.adapter.rename(oldPath, newPath);
    });

    context.set(
      "compile",
      (
        draft: Draft,
        workflow: Workflow,
        kinds: CompileStepKind[],
        statusCallback: (status: CompileStatus) => void
      ) => {
        compile(this.app, draft, workflow, kinds, statusCallback);
      }
    );

    context.set("openCompileStepMenu", () => new AddStepModal(this.app).open());
    context.set(
      "showCompileActionsMenu",
      (
        x: number,
        y: number,
        currentWorkflowName: string,
        action: (type: "new" | "rename" | "delete") => void
      ) => {
        const menu = new Menu();
        menu.addItem((item) => {
          item.setTitle("Add new workflow");
          item.setIcon("plus-with-circle");
          item.onClick(() => action("new"));
        });
        if (currentWorkflowName) {
          menu.addItem((item) => {
            item.setTitle(`Rename "${currentWorkflowName}"`);
            item.setIcon("pencil");
            item.onClick(() => action("rename"));
          });
          menu.addItem((item) => {
            item.setTitle(`Delete "${currentWorkflowName}"`);
            item.setIcon("trash");
            item.onClick(() => action("delete"));
          });
        }
        menu.showAtPosition({ x, y });
      }
    );

    context.set("migrate", () => {
      migrate(get(pluginSettings), this.app);
    });

    context.set("showNewDraftModal", () => {
      new NewDraftModal(this.app).open();
    });

    this.explorerView = new ExplorerView({
      target: this.contentEl,
      context,
    });
  }

  async onClose(): Promise<void> {
    this.undoManager.destroy();
    if (this.explorerView) {
      this.explorerView.$destroy();
    }
  }
}
