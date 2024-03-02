import type { App } from "obsidian";
import { vaultDirectoryTest } from "./tests/VaultDirectory.test";
import type { TestReporter } from "./framework/report";
import { RootTestSuite } from "./framework/suite";

/**
 * Collects the tests in a test suite and prepares them to be run.
 *
 * @returns A function that will run the test suite with the provided reporter
 */
export function integrationTests(app: App) {
  const suite = new RootTestSuite();

  // collect tests - add more tests here to include them in the build.
  vaultDirectoryTest(suite, app);

  // run with reporter
  return (reporter: TestReporter) => {
    return suite.collect(reporter).run(
      reporter,
      () => {},
      () => {}
    );
  };
}
