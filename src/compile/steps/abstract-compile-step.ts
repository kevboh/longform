import type { App, CachedMetadata } from "obsidian";

export enum CompileStepKind {
  /** Takes an array of scene files, processes them in some way, and outputs an array of scene files. */
  Scene = "Scene",
  /** Takes an array of scene files and processes them such that the output is a single manuscript file. */
  Join = "Join",
  /** Takes a single manuscript file, processes it in some way, and outputs a single manuscript file. */
  Manuscript = "Manuscript",
}

export function formatStepKind(k: CompileStepKind): string {
  switch (k) {
    case CompileStepKind.Scene:
      return "Scene";
    case CompileStepKind.Join:
      return "Join";
    case CompileStepKind.Manuscript:
      return "Manuscript";
  }
}

export function explainStepKind(k: CompileStepKind): string {
  switch (k) {
    case CompileStepKind.Scene:
      return "Runs on every scene in your manuscript and outputs the resulting scenes.";
    case CompileStepKind.Join:
      return "Accepts all scenes as input and outputs a single manuscript.";
    case CompileStepKind.Manuscript:
      return "Runs once on your compiled manuscript.";
  }
}

export enum CompileStepOptionType {
  Boolean,
  Text,
}

export interface CompileStepOption {
  id: string;
  name: string;
  description: string;
  type: CompileStepOptionType;
  default: unknown;
}

export interface CompileStepDescription {
  canonicalID: string;
  name: string;
  description: string;
  isScript: boolean;
  availableKinds: CompileStepKind[];
  options: CompileStepOption[];
}

export type CompileSceneInput = {
  path: string;
  name: string;
  contents: string;
  metadata: CachedMetadata;
};

export type CompileManuscriptInput = {
  contents: string;
};

// TODO: add duck typing function for steps to use to avoid checking context directly
export type CompileInput = CompileSceneInput[] | CompileManuscriptInput;

export type CompileContext = {
  /** The kind of step being performed. Can be used by steps with multiple available kinds to determine what should happen on compile. */
  kind: CompileStepKind;
  optionValues: { [id: string]: unknown };
  projectPath: string;
  app: App;
};

export interface CompileStep {
  id: string;
  description: CompileStepDescription;
  optionValues: { [id: string]: unknown };
  compile(
    input: CompileInput,
    context: CompileContext
  ): CompileInput | Promise<CompileInput>;
}

export type Workflow = {
  name: string;
  description: string;
  steps: CompileStep[];
};

export function makeBuiltinStep(
  v: {
    id: string;
    description: Omit<CompileStepDescription, "canonicalID" | "isScript">;
    compile: (
      input: CompileInput,
      context: CompileContext
    ) => CompileInput | Promise<CompileInput>;
  },
  isScript: boolean = false
): CompileStep {
  return {
    ...v,
    description: {
      ...v.description,
      canonicalID: v.id,
      isScript: isScript,
    },
    optionValues: v.description.options.reduce((agg, opt) => {
      return {
        ...agg,
        [opt.id]: opt.default,
      };
    }, {}),
  };
}

export function typeMismatchError(
  expected: string,
  got: string,
  context: CompileContext
): Error {
  return new Error(
    `[Longform] A compile step received a type it did not expect. It expected "${expected}", but got "${got}" with step kind "${context.kind}"`
  );
}

export const PLACEHOLDER_MISSING_STEP: CompileStep = {
  id: "placeholder-missing-step",
  description: {
    canonicalID: "placeholder-missing-step",
    name: "",
    description: "",
    isScript: false,
    availableKinds: [],
    options: [],
  },
  optionValues: {},
  compile: (a, b) => a,
};
