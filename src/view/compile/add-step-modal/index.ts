import { App, Modal } from "obsidian";

import AddStepModal from "./AddStepModal.svelte";
import { appContext } from "src/view/utils";

export default class AddStepModalContainer extends Modal {
  constructor(app: App) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;

    contentEl.createEl("h1", { text: "Add Compile Step to Workflow" });
    const entrypoint = contentEl.createDiv("longform-add-step-root");

    const context = appContext(this);
    context.set("close", () => this.close());

    new AddStepModal({
      target: entrypoint,
      context,
    });
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
