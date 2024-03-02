import type { TestRunReporter } from "./report";

export type DefinedSuite = {
  readonly name: string;
  readonly children: readonly (DefinedSuite | DefinedTest)[];
  readonly beforeAll: readonly AwaitableFn[];
  readonly beforeEach: readonly AwaitableFn[];
  readonly afterEach: readonly AwaitableFn[];
  readonly afterAll: readonly AwaitableFn[];
};

export type DefinedTest = {
  readonly name: string;
  readonly run: AwaitableFn;
};

async function combinedAwaitable(awaitables: readonly AwaitableFn[]) {
  for (const fn of awaitables) {
    const faliure = await runSafe(fn);
    if (faliure) {
      return faliure;
    }
  }
}

/**
 * Catches any errors that `fn` might throw, then returns it.
 */
function runSafe(fn: AwaitableFn) {
  let awaitable: Promise<void> | void;
  try {
    awaitable = fn();
  } catch (failure) {
    if (failure instanceof Error) return failure;
    return new Error(`${failure}`);
  }
  if (awaitable) {
    return awaitable.catch((failure) => {
      if (failure instanceof Error) return failure;
      return new Error(`${failure}`);
    });
  }
}

type DeferredRun = (
  reporter: TestRunReporter,
  beforeEach: AwaitableFn,
  afterEach: AwaitableFn
) => Promise<void>;

export function deferredSuiteRun(
  id: string,
  suite: DefinedSuite,
  children: readonly DeferredRun[]
): DeferredRun {
  return async function (
    reporter: TestRunReporter,
    beforeEach: AwaitableFn,
    afterEach: AwaitableFn
  ) {
    reporter.onStartSuite(id);

    const beforeAll = combinedAwaitable(suite.beforeAll);

    const childRuns = children.map((child) =>
      child(
        reporter,
        async () => {
          await beforeAll;
          await beforeEach();
          for (const fn of suite.beforeEach) {
            await fn();
          }
        },
        async () => {
          await combinedAwaitable(suite.afterEach);
          await runSafe(afterEach);
        }
      ).catch(console.error)
    );

    await Promise.allSettled(childRuns);

    await combinedAwaitable(suite.afterAll);

    reporter.onEndSuite(id);
  };
}

export function deferredTestRun(id: string, test: DefinedTest): DeferredRun {
  return async function (
    reporter: TestRunReporter,
    before: AwaitableFn,
    after: AwaitableFn
  ) {
    reporter.onStartTest(id);

    let result: unknown | undefined;
    try {
      await before();
      await test.run();
    } catch (e: unknown) {
      result = e;
      throw e;
    } finally {
      reporter.onEndTest(id, result, await runSafe(after));
    }
  };
}
