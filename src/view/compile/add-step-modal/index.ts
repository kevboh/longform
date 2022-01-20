import { App, Modal } from "obsidian";

import AddStepModal from "./AddStepModal.svelte";

export default class AddStepModalContainer extends Modal {
  private contents: AddStepModal;

  constructor(app: App) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;

    contentEl.createEl("h1", { text: "Add Compile Step to Workfow" });
    const entrypoint = contentEl.createDiv("longform-add-step-root");

    const context = new Map();
    context.set("close", () => this.close());

    this.contents = new AddStepModal({
      target: entrypoint,
      context,
    });
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
