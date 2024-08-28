import { collectSuite } from "./collect";
import type { TestCollectionReporter } from "./report";

export interface TestSuite {
  describe(name: string, fn: () => void): void;
  it(name: string, fn: AwaitableFn): void;
  beforeAll(fn: AwaitableFn): void;
  beforeEach(fn: AwaitableFn): void;
  afterEach(fn: AwaitableFn): void;
  afterAll(fn: AwaitableFn): void;
}

type Suite = {
  readonly name: string;
  children: (ChildSuite | Test)[];
  beforeAll: AwaitableFn[];
  beforeEach: AwaitableFn[];
  afterEach: AwaitableFn[];
  afterAll: AwaitableFn[];
};

type ChildSuite = Suite & {
  readonly parent: Suite;
};

type Test = {
  readonly name: string;
  readonly parent: Suite;
  readonly run: AwaitableFn;
};

function suite(name: string, parent: Suite): ChildSuite {
  return {
    name,
    parent,
    children: [],
    beforeAll: [],
    beforeEach: [],
    afterEach: [],
    afterAll: [],
  };
}

export class RootTestSuite implements TestSuite {
  private readonly rootSuite: Suite = {
    name: "Longform Integration Tests",
    children: [],
    beforeAll: [],
    beforeEach: [],
    afterEach: [],
    afterAll: [],
  };
  private currentSuite: Suite = this.rootSuite;

  constructor() {
    this.describe = this.describe.bind(this);
    this.it = this.it.bind(this);
    this.beforeEach = this.beforeEach.bind(this);
  }

  collect(reporter: TestCollectionReporter) {
    return {
      run: collectSuite(reporter, this.rootSuite),
    };
  }

  describe(name: string, fn: () => void): void {
    const parent = this.currentSuite;
    const child = suite(name, parent);
    parent.children.push(child);
    this.currentSuite = child;
    fn();
    this.currentSuite = parent;
  }

  it(name: string, fn: AwaitableFn): void {
    const test: Test = {
      name,
      parent: this.currentSuite,
      run: fn,
    };
    this.currentSuite.children.push(test);
  }

  beforeEach(fn: AwaitableFn): void {
    this.currentSuite.beforeEach.push(fn);
  }

  beforeAll(fn: AwaitableFn) {
    this.currentSuite.beforeAll.push(fn);
  }

  afterEach(fn: AwaitableFn) {
    this.currentSuite.afterEach.push(fn);
  }

  afterAll(fn: AwaitableFn) {
    this.currentSuite.afterAll.push(fn);
  }
}
