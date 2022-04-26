import { last } from "lodash";

const FRONTMATTER_REGEX = /^---(.*?\n)*---\n*/gm;

export function stripFrontmatter(contents: string): string {
  return contents.replace(FRONTMATTER_REGEX, "");
}

export function replaceFrontmatter(
  contents: string,
  newFrontmatter: string
): string {
  return contents.replace(FRONTMATTER_REGEX, newFrontmatter);
}

export function fileNameFromPath(path: string): string {
  return last(path.split("/")).split(".md")[0];
}
