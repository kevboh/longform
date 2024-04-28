import {
  FuzzySuggestModal,
  Keymap,
  type App,
  type Instruction,
  type PaneType,
} from "obsidian";

declare module "obsidian" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- cannot declare otherwise
	interface FuzzySuggestModal<T> {
		chooser?: {
			useSelectedItem: (evt: KeyboardEvent) => boolean;
			moveDown: (count: number) => void;
			moveUp: (count: number) => void;
		};
	}
}

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

    // navigate up/down with Tab and Shift+Tab
		this.scope.register([], "Tab", (evt: KeyboardEvent): void => {
			if (evt.isComposing || !this.chooser) return;
			this.chooser.moveDown(1);
		});
		this.scope.register(["Shift"], "Tab", (evt: KeyboardEvent): void => {
			if (evt.isComposing || !this.chooser) return;
			this.chooser.moveUp(1);
		});
    instructions.concat([{
      command: "↹ ",
      purpose: "Down",
    },{
      command: "↹ ",
      purpose: "Down",
    }])

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
