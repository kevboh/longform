import { writable } from "svelte/store";

export type ExplorerTab = "Scenes" | "Project" | "Compile";
export const selectedTab = writable<ExplorerTab>("Project");