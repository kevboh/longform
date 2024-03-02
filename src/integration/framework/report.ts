export interface TestCollectionReporter {
  onCollectSuite(id: string, name: string): void;
  onSuiteCollected(id: string): void;
  onCollectTest(id: string, name: string): void;
}

export interface TestRunReporter {
  onStartSuite(id: string): void;
  onEndSuite(id: string): void;

  onStartTest(id: string): void;
  onEndTest(
    id: string,
    result: unknown | void,
    afterResult: Error | void
  ): void;
}

export interface TestReporter extends TestCollectionReporter, TestRunReporter {}
