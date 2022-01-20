import { ConcatenateTextStep } from "./concatenate-text";
import { StripFrontmatterStep } from "./strip-frontmatter";
import { PrependTitleStep } from "./prepend-title";
import { RemoveCommentsStep } from "./remove-comments";
import { RemoveLinksStep } from "./remove-links";
import { WriteToNoteStep } from "./write-to-note";

export const BUILTIN_STEPS = [
  ConcatenateTextStep,
  StripFrontmatterStep,
  PrependTitleStep,
  RemoveCommentsStep,
  RemoveLinksStep,
  WriteToNoteStep,
];
