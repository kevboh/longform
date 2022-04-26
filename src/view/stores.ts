import type { TFile } from "obsidian";
import { writable } from "svelte/store";

// Writable stores
export const activeFile = writable<TFile | null>(null);
