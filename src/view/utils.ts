import { Platform } from "obsidian";

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
  if (Platform.isWin && name.match(/[\*"\\\/:<>|\?]*/g)) {
    return false;
  }
  if (name.match(/[\/\\:]/g)) {
    return false;
  }
  return true;
}
