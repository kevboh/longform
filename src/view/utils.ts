import { App, Modal, Platform, View } from "obsidian";
import { getContext } from "svelte";

export function selectElementContents(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

export function invalidFilenameCharacters(): string {
  if (Platform.isWin) {
    return '* " \\ / : < > | ?';
  }
  return "\\ / :";
}

export function isValidFilename(name: string): boolean {
  return !invalidFilenameCharacters()
    .split(" ")
    .some((c) => name.contains(c));
}

export function appContext(view: View | Modal): Map<string, any> {
  const context = new Map<string, any>();
  context.set("app", view.app);
  return context;
}

export function useApp(): App {
  return getContext("app") as App;
}
