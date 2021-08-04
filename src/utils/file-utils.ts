import { TAbstractFile, TFile } from "obsidian";

export function isFile(file: TAbstractFile): boolean {
  return file instanceof TFile;
}
