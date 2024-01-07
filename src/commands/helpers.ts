import {
  FuzzySuggestModal,
  Keymap,
  type App,
  type Instruction,
  type PaneType,
} from "obsidian";

export class JumpModal<T> extends FuzzySuggestModal<string> {
  items: Map<string, T>;
  onSelect: (value: T, modEvent: boolean | PaneType) => void;

  constructor(
    app: App,
    items: Map<string, T>,
    instructions: Instruction[] = [],
    onSelect: (value: T, modEvent: boolean | PaneType) => void
  ) {
    super(app);

    this.items = items;
    this.onSelect = onSelect;

    this.scope.register(["Meta"], "Enter", (evt) => {
      const result = this.containerEl.getElementsByClassName(
        "suggestion-item is-selected"
      );
      if (result.length > 0) {
        const selected = result[0].innerHTML;
        this.onChooseItem(selected, evt);
      }
      this.close();
      return false;
    });

    this.setInstructions(instructions);
  }

  getItems(): string[] {
    return Array.from(this.items.keys());
  }

  getItemText(item: string): string {
    return item;
  }

  onChooseItem(item: string, evt: MouseEvent | KeyboardEvent): void {
    this.onSelect(this.items.get(item), Keymap.isModEvent(evt));
  }
}
