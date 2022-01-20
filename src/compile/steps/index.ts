import { ConcatenateTextStep } from "./concatenate-text";
import { StripFrontmatterStep } from "./strip-frontmatter";
import { PrependTitleStep } from "./prepend-title";
import { RemoveLinksStep } from "./remove-links";
import { WriteToNoteStep } from "./write-to-note";

export const BUILTIN_STEPS = [
  ConcatenateTextStep,
  StripFrontmatterStep,
  PrependTitleStep,
  RemoveLinksStep,
  WriteToNoteStep,
];
