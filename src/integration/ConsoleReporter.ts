import type { TestReporter } from "./framework/report";

type StructuredResults = {
  id: string;
  name: string;
  parent: StructuredResults | null;
  result: Error | void;
};

/**
 * Reports test restuls to the console.
 */
export class ConsoleReporter implements TestReporter {
  private structure: StructuredResults = {
    id: "root",
    name: "root",
    parent: null,
    result: undefined,
  };

  private readonly structures = new Map<string, StructuredResults>();

  /**
   *
   * @param verbose If you want to see all the running tests, and all tests that pass, set to `true`.
   * @default verbose `false`
   */
  constructor(private readonly verbose: boolean = false) {}

  onCollectSuite(id: string, name: string): void {
    const structure: StructuredResults = {
      id,
      name,
      parent: this.structure,
      result: undefined,
    };
    this.structure = structure;
    this.structures.set(id, structure);
  }

  onSuiteCollected(id: string): void {
    this.structure = this.structure.parent;
  }

  onCollectTest(id: string, name: string): void {
    const structure: StructuredResults = {
      id,
      name,
      parent: this.structure,
      result: undefined,
    };
    this.structures.set(id, structure);
  }

  onStartSuite(id: string): void {}

  onStartTest(id: string): void {
    if (this.verbose) {
      const structure = this.structures.get(id);
      const fullName = buildName(structure);
      console.log("Running", fullName);
    }
  }

  onEndTest(
    id: string,
    result: unknown | void,
    afterResult: void | Error
  ): void {
    const structure = this.structures.get(id);
    const fullName = buildName(structure);
    if (!!result) {
      console.log("failed", fullName);
    } else if (this.verbose) {
      console.log("passed", fullName);
    }
  }

  onEndSuite(id: string): void {}
}

function buildName(structure: StructuredResults): string {
  if (structure.parent) {
    return buildName(structure.parent) + " > " + structure.name;
  }
  if (structure.id === "root") {
    return "";
  }
  return structure.name;
}
