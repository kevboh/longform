import { App, Modal, ButtonComponent } from "obsidian";
import type LongformPlugin from "src/main";

export default class ConfirmActionModal extends Modal {
  plugin: LongformPlugin;
  title: string;
  explanation: string;
  yesText: string;
  yesAction: () => void;
  noText: string;
  noAction: () => void;

  constructor(
    app: App,
    title: string,
    explanation: string,
    yesText: string,
    yesAction: () => void,
    noText: string = "Cancel",
    noAction: () => void = () => this.close()
  ) {
    super(app);
    this.title = title;
    this.explanation = explanation;
    this.yesText = yesText;
    this.yesAction = yesAction;
    this.noText = noText;
    this.noAction = noAction;
  }

  onOpen(): void {
    const { contentEl } = this;

    contentEl.createEl("h1", { text: this.title });
    contentEl.createEl("p", { text: this.explanation });
    new ButtonComponent(contentEl)
      .setButtonText(this.noText)
      .onClick(this.noAction);
    new ButtonComponent(contentEl)
      .setButtonText(this.yesText)
      .setWarning()
      .onClick(() => {
        this.yesAction();
        this.close();
      });
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
