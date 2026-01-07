import { ConcatenateTextStep } from "./concatenate-text";
import { PrependTitleStep } from "./prepend-title";
import { RemoveCommentsStep } from "./remove-comments";
import { RemoveLinksStep } from "./remove-links";
import { RemoveStrikethroughsStep } from "./remove-strikethroughs";
import { RemoveTasksStep } from "./remove-tasks";
import { StripFrontmatterStep } from "./strip-frontmatter";
import { WriteToNoteStep } from "./write-to-note";
import { AddFrontmatterStep } from "./add-frontmatter";

export const BUILTIN_STEPS = [
  AddFrontmatterStep,
  ConcatenateTextStep,
  PrependTitleStep,
  RemoveCommentsStep,
  RemoveLinksStep,
  RemoveStrikethroughsStep,
  RemoveTasksStep,
  StripFrontmatterStep,
  WriteToNoteStep,
];
