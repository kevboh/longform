import {
  arraysToIndentedScenes,
  indentedScenesToArrays,
  numberScenes,
  formatSceneNumber,
  type NumberedScene,
} from "src/model/draft-utils";
import type { IndentedScene } from "src/model/types";

/** Provides API access to useful Longform-specific functions. */
export class LongformAPI {
  /**
   * Converts an array of scenes w/ indentation information into a YAML-compatible array of potentially-nested arrays.
   *
   * Longform uses the way YAML formats nested arrays to encode indentation information into frontmatter: you can use this function
   * to produce those arrays as needed. For example, the input:
   *
   * ```js
   * [
   *  {title: "My First Scene", indent: 0},
   *  {title: "My Second Scene", indent: 1},
   *  {title: "My Third Scene", indent: 0}
   * ]
   * ```
   *
   * would produce the following output:
   *
   * ```js
   * ["My First Scene", ["My Second Scene"], "My Third Scene"]
   * ```
   *
   * passing that output into an object-to-YAML function (like Obsidian’s `stringifyYaml`) would produce:
   *
   * ```yaml
   * - My First Scene
   * - - My Second Scene
   * - My Third Scene
   * ```
   *
   * @param indentedScenes Array of { title: string; indent: number } scene objects, where `title` is the scene’s name and `indent` is the 0-indexed indentation level.
   * @returns A potentially-nested array of strings. Each element in the returned array is of type `string | string[] | string[][]...` ad infinitum; TypeScript struggles to represent this sort of type, unfortunately.
   */
  public indentedScenesToNestedArrays(indentedScenes: IndentedScene[]): any[] {
    return indentedScenesToArrays(indentedScenes);
  }

  /**
   * Converts a YAML-compatible potentially-nested array of strings into a single-dimension array of `{title: string; indent: number}` objects.
   *
   * Longform uses the YAML format to store scenes with indentation information; this function is useful if you want to read that YAML yourself and convert it into data you can reason about. For examle, the YAML:
   *
   * ```yaml
   * - My First Scene
   * - - My Second Scene
   * - My Third Scene
   * ```
   *
   * corresponds to the following array when serialized into JavaScript:
   *
   * ```js
   * ["My First Scene", ["My Second Scene"], "My Third Scene"]
   * ```
   *
   * which, when passed into this function, would produce:
   *
   * ```js
   * [
   *  {title: "My First Scene", indent: 0},
   *  {title: "My Second Scene", indent: 1},
   *  {title: "My Third Scene", indent: 0}
   * ]
   * ```
   *
   * @param yamlArray An array of potentially-nested strings. Each element in the returned array is of type `string | string[] | string[][]...` ad infinitum; TypeScript struggles to represent this sort of type, unfortunately.
   * @returns Array of { title: string; indent: number } scene objects, where `title` is the scene’s name and `indent` is the 0-indexed indentation level.
   */
  public nestedArraysToIndentedScenes(yamlArray: any[]): IndentedScene[] {
    return arraysToIndentedScenes(yamlArray);
  }

  /**
   * Annotates an array of indented scenes with a `numbering` property, an array of `number`s.
   * This property corresponds to each scene’s “number,” where a scene with no indent is numbered `[1]` or `[2]` or `[3]`, etc.
   * while an indented scene might be numbered `[1, 1, 2]` to indicate scene 1.1.2, the second scene at a third indent under the first scene and first subscene.
   * @param scenes Array of `IndentedScene`s to annotate.
   * @returns Array of `NumberedScene`s, which are `IndentedScene`s with an added `numbering` property of type `number[]`.
   */
  public scenesWithNumberings(scenes: IndentedScene[]): NumberedScene[] {
    return numberScenes(scenes);
  }

  /**
   * Given an array of numbers, returns the string corresponding to those numbers formatted as scene/subscene “numbering.”
   * For example, `[1, 1, 2]` becomes `"1.1.2"`.
   * @param numbering Array of numbers corresponding a scene’s “number.”
   * @returns Formatted numbering for display.
   */
  public formatSceneNumbering(numbering: number[]): string {
    return formatSceneNumber(numbering);
  }
}
