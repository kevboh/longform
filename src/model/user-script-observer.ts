import debounce from "lodash/debounce";
import { Vault, FileSystemAdapter, Platform, TAbstractFile } from "obsidian";
import {
  CompileStep,
  CompileStepKind,
  CompileStepOptionType,
  makeBuiltinStep,
  Workflow,
} from "src/compile";
import { pluginSettings, userScriptSteps, workflows } from "src/view/stores";
import { get, Unsubscriber } from "svelte/store";

const DEBOUNCE_SCRIPT_LOAD_DELAY_MS = 10_000;

/**
 * Watches the user's script folder and loads the scripts it finds there.
 */
export class UserScriptObserver {
  private vault: Vault;
  userScriptFolder: string | null;
  private unsubscribeScriptFolder: Unsubscriber;
  private initializedSteps = false;
  private onScriptModify: any;

  constructor(vault: Vault, userScriptFolder: string | null) {
    this.vault = vault;
    this.userScriptFolder = userScriptFolder;
    this.onScriptModify = debounce(() => {
      console.log(
        `[Longform] File in user script folder modified, reloading scripts…`
      );
      this.loadUserSteps();
    }, DEBOUNCE_SCRIPT_LOAD_DELAY_MS);
  }

  destroy(): void {
    this.unsubscribeScriptFolder();
  }

  beginObserving() {
    if (this.unsubscribeScriptFolder) {
      this.unsubscribeScriptFolder();
    }
    this.unsubscribeScriptFolder = pluginSettings.subscribe(async (s) => {
      if (
        this.initializedSteps &&
        s.userScriptFolder === this.userScriptFolder
      ) {
        return;
      }
      this.userScriptFolder = s.userScriptFolder;
      if (this.userScriptFolder && Platform.isDesktopApp) {
        await this.loadUserSteps();
      } else {
        userScriptSteps.set(null);
        console.log("[Longform] Cleared user script steps.");
      }
    });
  }

  async loadUserSteps() {
    if (!this.userScriptFolder) {
      console.log("no user script folder");
      return;
    }

    // Get all .js files in folder
    const { files } = await this.vault.adapter.list(this.userScriptFolder);
    const scripts = files.filter((f) => f.endsWith("js"));

    const userSteps: CompileStep[] = [];
    for (const file of scripts) {
      try {
        const step = await this.loadScript(file);
        userSteps.push(step);
      } catch (e) {
        console.error(
          `[Longform] skipping user script ${file} due to error:`,
          e
        );
      }
    }

    console.log(`[Longform] Loaded ${userSteps.length} user script steps.`);
    userScriptSteps.set(userSteps);

    this.initializedSteps = true;

    // if workflows have loaded, merge in user steps to get updated values
    const _workflows = get(workflows);
    const workflowNames = Object.keys(_workflows);
    const mergedWorkflows: Record<string, Workflow> = {};
    workflowNames.forEach((name) => {
      const workflow = _workflows[name];
      const workflowSteps = workflow.steps.map((step) => {
        const userStep = userSteps.find(
          (u) => step.description.canonicalID === u.description.canonicalID
        );
        if (userStep) {
          let mergedStep = {
            ...userStep,
            id: step.id,
            optionValues: userStep.optionValues,
          };
          // Copy existing step's option values into the merged step
          for (const key of Object.keys(step.optionValues)) {
            if (mergedStep.optionValues[key]) {
              mergedStep = {
                ...mergedStep,
                optionValues: {
                  ...mergedStep.optionValues,
                  [key]: step.optionValues[key],
                },
              };
            }
          }
          return mergedStep;
        } else {
          return step;
        }
      });
      mergedWorkflows[name] = {
        ...workflow,
        steps: workflowSteps,
      };
    });
    workflows.set(mergedWorkflows);

    return userSteps;
  }

  private async loadScript(path: string): Promise<CompileStep> {
    if (!(this.vault.adapter instanceof FileSystemAdapter)) {
      console.error(
        "[Longform] Attempted to load user scripts on a platform without a FileSystemAdapter."
      );
      throw new Error(`User scripts can only load and run on desktop.`);
    }
    const vaultPath = this.vault.adapter.getBasePath();
    const filePath = `${vaultPath}/${path}`;

    if (Object.keys(window.require.cache).contains(filePath)) {
      delete window.require.cache[window.require.resolve(filePath)];
    }
    const userScript = await import(filePath);

    if (!userScript.default) {
      console.error(
        `[Longform] Failed to load user script ${filePath}. No exports detected.`
      );
      throw new Error(
        `Failed to load user script ${filePath}. No exports detected.`
      );
    }

    const loadedStep = await Promise.resolve(userScript.default);

    const step = makeBuiltinStep(
      {
        ...loadedStep,
        id: filePath,
        description: {
          ...loadedStep.description,
          availableKinds: loadedStep.description.availableKinds.map(
            (v: string) => CompileStepKind[v as keyof typeof CompileStepKind]
          ),
          options: loadedStep.description.options.map((o: any) => ({
            ...o,
            type: CompileStepOptionType[
              o.type as keyof typeof CompileStepOptionType
            ],
          })),
        },
      },
      true
    );

    return {
      ...step,
      id: filePath,
      description: {
        ...step.description,
        canonicalID: filePath,
        isScript: true,
      },
    };
  }

  fileEventCallback(file: TAbstractFile) {
    if (
      this.userScriptFolder &&
      file.path.endsWith("js") &&
      ((file.parent && file.parent.path == this.userScriptFolder) ||
        (file.parent === null && file.path.startsWith(this.userScriptFolder)))
    ) {
      this.onScriptModify();
    }
  }
}
