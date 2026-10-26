export class TFile {
  path: string;
  parent: { path: string };

  constructor(path: string, parentPath = "") {
    this.path = path;
    this.parent = { path: parentPath };
  }
}

export function normalizePath(value: string): string {
  return value
    .split("/")
    .filter((part) => part && part !== ".")
    .join("/");
}

export class Notice {}
