import { ItemView, Menu, WorkspaceLeaf } from "obsidian";
import { compile, CompileStatus, CompileStepKind, Workflow } from "src/compile";
import AddStepModal from "../compile/add-step-modal";
import ConfirmActionModal from "../ConfirmActionModal";
import { ICON_NAME } from "../icon";
import ExplorerView from "./ExplorerView.svelte";

export const VIEW_TYPE_LONGFORM_EXPLORER = "VIEW_TYPE_LONGFORM_EXPLORER";

export class ExplorerPane extends ItemView {
  private explorerView: ExplorerView;

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
    const context = new Map();

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

    // Context function for opening scene notes on click
    context.set("onSceneClick", (path: string, newLeaf: boolean) => {
      this.app.workspace.openLinkText(path, "/", newLeaf);
    });

    // Context function for creating new scene notes given a path
    context.set("onNewScene", async (path: string) => {
      await this.app.vault.create(path, "");
      this.app.workspace.openLinkText(path, "/", false);
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

    // Context function for showing a right-click menu
    context.set("onContextClick", (path: string, x: number, y: number) => {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (!file) {
        return;
      }
      const menu = new Menu(this.app);
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
      // Triggering this event lets other apps insert menu items
      // including Obsidian, giving us lots of stuff for free.
      this.app.workspace.trigger("file-menu", menu, file, "longform");
      menu.showAtPosition({ x, y });
    });
    context.set(
      "showRenameDraftMenu",
      (x: number, y: number, action: () => void) => {
        const menu = new Menu(this.app);
        menu.addItem((item) => {
          item.setTitle("Rename");
          item.setIcon("pencil");
          item.onClick(action);
        });
        menu.showAtPosition({ x, y });
      }
    );
    context.set("renameFolder", (oldPath: string, newPath: string) => {
      this.app.vault.adapter.rename(oldPath, newPath);
    });

    context.set(
      "compile",
      (
        projectPath: string,
        draftName: string,
        workflow: Workflow,
        kinds: CompileStepKind[],
        statusCallback: (status: CompileStatus) => void
      ) => {
        compile(
          this.app,
          projectPath,
          draftName,
          workflow,
          kinds,
          statusCallback
        );
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
        const menu = new Menu(this.app);
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

    this.explorerView = new ExplorerView({
      target: this.contentEl,
      context,
    });
  }

  async onClose(): Promise<void> {
    if (this.explorerView) {
      this.explorerView.$destroy();
    }
  }
}
