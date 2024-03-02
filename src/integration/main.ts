import { Plugin } from "obsidian";
import { integrationTests } from "./run";
import { ConsoleReporter } from "./ConsoleReporter";

/**
 * An obsidian plugin dedicated ONLY to running integration tests with the obsidian API.
 */
export default class TestPlugin extends Plugin {
  onload(): void {
    const run = integrationTests(this.app);

    this.app.workspace.onLayoutReady(() => {
      run(new ConsoleReporter());
    });
  }
}
