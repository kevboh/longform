import type { KeymapContext } from "obsidian";

/**
 * Return `false` to automatically preventDefault
 */
export type UndoListener = (
  type: "undo" | "redo",
  evt: KeyboardEvent,
  ctx: KeymapContext
) => boolean;

export class UndoManager {
  listeners: UndoListener[] = [];

  destroy() {
    this.listeners = [];
  }

  on(listener: UndoListener): void {
    this.listeners.push(listener);
  }

  send(type: "undo" | "redo", evt: KeyboardEvent, ctx: KeymapContext) {
    for (const listener of this.listeners) {
      listener(type, evt, ctx);
    }
  }
}
