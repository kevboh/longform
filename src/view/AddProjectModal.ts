import { App, Modal, TextComponent, ButtonComponent } from "obsidian";
import type LongformPlugin from "src/main";

export default class AddProjectModal extends Modal {
  plugin: LongformPlugin;
  path: string;

  constructor(app: App, plugin: LongformPlugin, path: string) {
    super(app);
    this.plugin = plugin;
    this.path = path;
  }

  onOpen(): void {
    const { contentEl } = this;

    const title = document.createElement("h1");
    title.setText("Add to Longform");
    contentEl.appendChild(title);

    const indexFileField = this.addField(
      contentEl,
      "Index File Name",
      "Index",
      "Index",
      "A project’s index file acts as storage for all the metadata necessary to make a Longform project work. You can edit it (it’s Markdown), but Longform will mostly be reading and writing it directly."
    );

    const draftsFolderField = this.addField(
      contentEl,
      "Drafts Folder Name",
      "Drafts/",
      "Drafts/",
      "Every folder inside your drafts folder is a single draft of your project. You can name drafts whatever you’d like: Drafts/1/, Drafts/First Draft/, etc. Each draft folder will hold the individual files (scenes) that make up your project. Scenes are ordered manually. Other folders and files in the project are always reachable in the Obsidian file explorer."
    );

    const doAdd = async () => {
      const indexFile = indexFileField.getValue();
      const draftsPath = draftsFolderField.getValue();
      await this.plugin.markPathAsProject(this.path, {
        path: this.path,
        indexFile,
        draftsPath,
      });
      this.close();
    };
    const saveButton = new ButtonComponent(contentEl)
      .setButtonText("Add to Longform")
      .onClick(doAdd);
    saveButton.buttonEl.id = "longform-add-button";

    indexFileField.inputEl.focus();
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }

  private addField(
    rootEl: HTMLElement,
    label: string,
    placeholder: string,
    value = "",
    description = ""
  ): TextComponent {
    const inputId = label.replace(" ", "-").toLowerCase();

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexDirection = "row";
    container.style.justifyContent = "space-between";
    container.style.alignContent = "center";
    rootEl.appendChild(container);

    const labelEl = document.createElement("label");
    labelEl.setText(label);
    labelEl.htmlFor = inputId;
    labelEl.style.display = "flex";
    labelEl.style.alignItems = "center";
    labelEl.style.marginRight = "12px";
    container.appendChild(labelEl);

    const field = new TextComponent(container).setPlaceholder(placeholder);
    field.inputEl.value = value;
    field.inputEl.style.flexGrow = "1";
    field.inputEl.id = inputId;

    if (description.length > 0) {
      const descriptionEl = document.createElement("p");
      descriptionEl.setText(description);
      descriptionEl.style.color = "var(--text-muted)";
      rootEl.appendChild(descriptionEl);
    }

    return field;
  }
}
