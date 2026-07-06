export const debounce = <T extends (...args: unknown[]) => unknown>(fn: T, _wait: number, _immediate?: boolean): T => {
  return fn;
};

export abstract class TAbstractFile {
  path: string = "";
  vault: unknown = null;
}

export class TFile extends TAbstractFile {
  stat = { ctime: 0, mtime: 0, size: 0 };
  basename = "";
  extension = "";
  name = "";
  parent = null;
}

export class Vault {}
