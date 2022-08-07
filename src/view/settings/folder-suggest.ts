// Credits go to Liam's Periodic Notes Plugin: https://github.com/liamcain/obsidian-periodic-notes

import { App, normalizePath, TAbstractFile, TFolder } from "obsidian";
import { TextInputSuggest } from "./suggest";

export class FolderSuggest extends TextInputSuggest<TFolder> {
  relativeRoot: string | null;

  constructor(
    app: App,
    inputEl: HTMLInputElement | HTMLTextAreaElement,
    relativeRoot: string = null
  ) {
    super(app, inputEl);

    this.relativeRoot = relativeRoot && normalizePath(relativeRoot);
  }

  getSuggestions(inputStr: string): TFolder[] {
    const abstractFiles = this.app.vault.getAllLoadedFiles();
    const folders: TFolder[] = [];
    const lowerCaseInputStr = inputStr.toLowerCase();

    abstractFiles.forEach((folder: TAbstractFile) => {
      if (
        folder instanceof TFolder &&
        folder.path.toLowerCase().contains(lowerCaseInputStr) &&
        (this.relativeRoot === null ||
          folder.path.startsWith(this.relativeRoot))
      ) {
        folders.push(folder);
      }
    });

    return folders;
  }

  renderSuggestion(file: TFolder, el: HTMLElement): void {
    el.setText(this.withRelativePath(file.path));
  }

  selectSuggestion(file: TFolder): void {
    const value = this.withRelativePath(file.path);
    this.inputEl.value = value;
    this.inputEl.trigger("input");
    this.close();
  }

  private withRelativePath(path: string): string {
    if (this.relativeRoot && path.length >= this.relativeRoot.length) {
      let text = path.slice(this.relativeRoot.length);
      text = text.startsWith("/") ? text.slice(1) : text;
      text = text.length === 0 ? "/" : text;
      return text;
    } else {
      return path;
    }
  }
}
