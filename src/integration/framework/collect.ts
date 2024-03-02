import type { TestCollectionReporter, TestReporter } from "./report";
import {
  deferredSuiteRun,
  deferredTestRun,
  type DefinedSuite,
  type DefinedTest,
} from "./run";

let suiteCount = 0;

export function collectSuite(
  reporter: TestCollectionReporter,
  suite: DefinedSuite
) {
  suiteCount++;
  const id =
    new Date().getTime() +
    "_" +
    Math.random().toString().slice(2) +
    "_" +
    suiteCount;
  reporter.onCollectSuite(id, suite.name);

  const children = suite.children.map((child) => collectChild(reporter, child));

  reporter.onSuiteCollected(id);

  return deferredSuiteRun(id, suite, children);
}

function collectChild(
  reporter: TestCollectionReporter,
  child: DefinedSuite | DefinedTest
): (
  reporter: TestReporter,
  before: AwaitableFn,
  after: AwaitableFn
) => Promise<void> {
  if ("children" in child) {
    return collectSuite(reporter, child);
  } else {
    return collectTest(reporter, child);
  }
}

let testCount = 0;
function collectTest(
  reporter: TestCollectionReporter,
  test: DefinedTest
): (
  reporter: TestReporter,
  before: AwaitableFn,
  after: AwaitableFn
) => Promise<void> {
  testCount++;
  const id =
    new Date().getTime() +
    "_" +
    Math.random().toString().slice(2) +
    "_" +
    testCount;
  reporter.onCollectTest(id, test.name);

  return deferredTestRun(id, test);
}
