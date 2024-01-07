import type { App, CachedMetadata } from "obsidian";
import type { Draft } from "src/model/types";

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

/** The type of an option’s value. Determines the type of input in the compile UI. */
export enum CompileStepOptionType {
  /** A checkbox corresponding to either true or false. */
  Boolean,
  /** A single-line freeform text entry. */
  Text,
}

/**
 * A description of one of a compile’s step options, for display to the user.
 * Actual option values as provided by the user are made available in the compile
 * context at compile-time.
 */
export interface CompileStepOption {
  /** An identifier used to fetch the value at runtime. */
  id: string;
  /** A title used to display the option. */
  name: string;
  /** A description of the option, shown under it. */
  description: string;
  /** The type of the option’s value. */
  type: CompileStepOptionType;
  /** What the option’s value should default to. */
  default: unknown;
}

/**
 * An object describing a compile step: the skeleton of a step without its
 * instantiated values. Used to display a gallery of steps and to instantiate them.
 */
export interface CompileStepDescription {
  /** Unique identifier for this step. */
  canonicalID: string;
  /** Name of the step for display. Title case. */
  name: string;
  /** Longer text description of the step, shown under it in UI. Normal case. */
  description: string;
  /** `true` if this step corresponds to a user-provided .js file in the vault. */
  isScript: boolean;
  /** The kinds (scene, join, and manuscript) of step this step can be. */
  availableKinds: CompileStepKind[];
  /** An array of options, if any, for the step. */
  options: CompileStepOption[];
}

/** The per-scene payload used for Scene and Join steps at compile-time. */
export type CompileSceneInput = {
  /** The path to the scene. */
  path: string;
  /** The name of the scene (filename without parent path or .md extension) */
  name: string;
  /** The text contents of the scene (including frontmatter, if present and not stripped by a previous step) */
  contents: string;
  /** Any metadata provided by Obsidian about this file. */
  metadata: CachedMetadata;
  /** The 0-based indentation of the scene, if this scene belongs to a multi-scene project. */
  indentationLevel?: number;
  /** The array of numbers corresponding to this scene’s “number,” e.g. `1.1.2`, if this scene belongs to a multi-scene project. */
  numbering?: number[];
};

/** The per-manuscript payload used for Manuscript steps at compile-time. */
export type CompileManuscriptInput = {
  contents: string;
};

// TODO: add duck typing function for steps to use to avoid checking context directly
/**
 * Either an array of scene-based inputs, or a single manuscript-based input.
 */
export type CompileInput = CompileSceneInput[] | CompileManuscriptInput;

/**
 * An object describing the context around the current compilation execution.
 * Provides info to steps to help them run correctly, including information about
 * the current inputs, the current project, access to Obsidian APIs, and some
 * utility functions.
 */
export type CompileContext = {
  /** The kind of step being performed. Can be used by steps with multiple available kinds to determine what should happen on compile. */
  kind: CompileStepKind;
  /**
   * A map of option IDs to option values as input by the user.
   * @note Boolean options will be `true` or `false`. Text options will be strings. Text option values are
   * not automatically trimmed: if your step expects a trimmed string, it must do so itself.
   */
  optionValues: { [id: string]: unknown };
  /** The path, relative to the vault root, to the compiled project. */
  projectPath: string;
  /** The Draft option describing the draft currently being compiled. */
  draft: Draft;
  /** Obsidian’s app object, for accessing APIs. */
  app: App;
  /** Utility functions provided to steps for convenience. */
  utilities: {
    /** Obsidian’s normalizePath function. Converts an arbitrary file path string into a normalized one. */
    normalizePath: (path: string) => string;
  };
};

/**
 * A step in a workflow that turns a Longform project into a compiled document (or some other result).
 */
export interface CompileStep {
  /** A unique identifier for the step. */
  id: string;
  /** Enough info to instantiate this step. Serializable, used to store the step in a workflow. */
  description: CompileStepDescription;
  /** A map of option IDs to values, used to serialize this step for storage. */
  optionValues: { [id: string]: unknown };
  /**
    Function that is executed during compilation. It may be `async`.
    Errors encountered during execution should be thrown and will
    be handled by Longform.
    @param input See `CompileInput`
    @param context See `CompileContext`
    @note For an example of using `context` to determine the shape of `input`, see
    https://github.com/kevboh/longform/blob/main/src/compile/steps/strip-frontmatter.ts
    @returns If of kind "Scene" or "Manuscript", the same shape as `input`
    with the appropriate changes made to `contents`. If of kind "Join",
    the same shape as a "Manuscript" step input.
  */
  compile(
    input: CompileInput,
    context: CompileContext
  ): CompileInput | Promise<CompileInput>;
}

/** A named series of steps to compile a Longform project into a finished product. */
export type Workflow = {
  /** The name of the workflow via user input. */
  name: string;
  /** A longer description of the workflow. */
  description: string;
  /** The steps that comprise the workflow. */
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
  isScript = false
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
  compile: (a) => a,
};
