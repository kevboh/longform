import { get } from "svelte/store";
import { Notice } from "obsidian";

import type { CommandBuilder } from "./types";
import {
  currentWorkflow,
  projects,
  selectedDraft,
  workflows,
} from "src/model/stores";
import {
  WorkflowError,
  calculateWorkflow,
  compile,
  type CompileStatus,
} from "src/compile";
import { JumpModal } from "./helpers";
import { draftTitle } from "src/model/draft-utils";
import type { Draft } from "src/model/types";

export const compileCurrent: CommandBuilder = (plugin) => ({
  id: "longform-compile-current",
  name: "Compile current project with current workflow",
  checkCallback: (checking: boolean) => {
    const draft = get(selectedDraft);
    const workflow = get(currentWorkflow);
    if (checking) {
      return !!draft && !!workflow;
    }
    if (!draft || !workflow) {
      return;
    }

    const [validation, calculatedKinds] = calculateWorkflow(
      workflow,
      draft.format === "scenes"
    );
    if (validation.error !== WorkflowError.Valid) {
      new Notice(validation.error);
      return;
    }

    function onCompileStatusChange(status: CompileStatus) {
      if (status.kind == "CompileStatusSuccess") {
        new Notice("Compile complete.");
      }
    }

    compile(
      plugin.app,
      draft,
      workflow,
      calculatedKinds,
      onCompileStatusChange
    );
  },
});

export const compileSelection: CommandBuilder = (plugin) => ({
  id: "longform-compile-selection",
  name: "Compile project…",
  checkCallback: (checking: boolean) => {
    const allProjects = get(projects);
    const projectTitles = Object.keys(allProjects);
    if (checking) {
      return projectTitles.length > 0;
    }

    const opts = new Map(projectTitles.map((t) => [t, t]));

    // Choose project
    new JumpModal(
      plugin.app,
      opts,
      [
        {
          command: "↑↓",
          purpose: "to navigate",
        },
        {
          command: "↵",
          purpose: "to choose draft",
        },
        {
          command: "esc",
          purpose: "to dismiss",
        },
      ],
      (k) => {
        // Choose draft
        const project = allProjects[k];
        if (!project) {
          return;
        }
        const opts = new Map();
        project.forEach((d) => {
          opts.set(draftTitle(d), d);
        });

        new JumpModal(
          plugin.app,
          opts,
          [
            {
              command: "↑↓",
              purpose: "to navigate",
            },
            {
              command: "↵",
              purpose: "to choose workflow",
            },
            {
              command: "esc",
              purpose: "to dismiss",
            },
          ],
          (draft: Draft) => {
            // Choose workflow

            const allWorkflows = get(workflows);
            const opts = new Map();
            Object.keys(allWorkflows).forEach((k) => {
              opts.set(k, allWorkflows[k]);
            });

            new JumpModal(
              plugin.app,
              opts,
              [
                {
                  command: "↑↓",
                  purpose: "to navigate",
                },
                {
                  command: "↵",
                  purpose: "to compile",
                },
                {
                  command: "esc",
                  purpose: "to dismiss",
                },
              ],
              (workflow) => {
                // Compile
                const [validation, calculatedKinds] = calculateWorkflow(
                  workflow,
                  draft.format === "scenes"
                );
                if (validation.error !== WorkflowError.Valid) {
                  new Notice(validation.error);
                  return;
                }

                function onCompileStatusChange(status: CompileStatus) {
                  if (status.kind == "CompileStatusSuccess") {
                    new Notice("Compile complete.");
                  }
                }

                compile(
                  plugin.app,
                  draft,
                  workflow,
                  calculatedKinds,
                  onCompileStatusChange
                );
              }
            ).open();
          }
        ).open();
      }
    ).open();
  },
});
