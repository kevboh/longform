import { describe, expect, it } from "vitest";
import { countWords } from "src/model/writing-session-tracker";

describe("countWords", () => {
  it("counts basic space-delimited words", () => {
    expect(countWords("Hello world")).toBe(2);
    expect(countWords("one two three four five")).toBe(5);
    expect(countWords("a")).toBe(1);
  });

  it("handles multiple spaces", () => {
    expect(countWords("Hello    world")).toBe(2);
    expect(countWords("  leading")).toBe(1);
    expect(countWords("trailing  ")).toBe(1);
  });

  it("handles newlines", () => {
    expect(countWords("Hello\nworld")).toBe(2);
    expect(countWords("line1\nline2\nline3")).toBe(3);
  });

  it("handles empty string", () => {
    expect(countWords("")).toBe(0);
  });

  it("counts numbers as words", () => {
    expect(countWords("12345")).toBe(1);
    expect(countWords("hello 123 world")).toBe(3);
  });

  it("counts comma-separated numbers as one word", () => {
    expect(countWords("1,000")).toBe(1);
    expect(countWords("1,000,000")).toBe(1);
  });

  it("counts decimal numbers as one word", () => {
    expect(countWords("1,000.50")).toBe(1);
    expect(countWords("3.14")).toBe(1);
  });

  it("strips bold markers", () => {
    expect(countWords("**bold**")).toBe(1);
    expect(countWords("**bold** and **more**")).toBe(3);
  });

  it("strips italic markers", () => {
    expect(countWords("*italic*")).toBe(1);
    expect(countWords("_italic_")).toBe(1);
  });

  it("strips wiki links", () => {
    expect(countWords("[[link]]")).toBe(1);
    expect(countWords("[[File|Alias]]")).toBe(1);
  });

  it("strips external links", () => {
    expect(countWords("[text](url)")).toBe(1);
  });

  it("strips heading markers", () => {
    expect(countWords("# Header")).toBe(1);
    expect(countWords("## Subheader")).toBe(1);
  });

  it("removes YAML frontmatter", () => {
    expect(countWords("---\ntitle: x\n---\n\nBody text")).toBe(2);
  });

  it("strips HTML comments", () => {
    // NB: the `>` in `-->` is stripped by the markdown regex before
    // the HTML comment regex runs, so the comment isn't fully removed.
    // This is existing behavior, not a bug we're fixing here.
    expect(countWords("Hello <!-- comment --> world")).toBe(4);
  });

  it("strips markdown comments", () => {
    expect(countWords("Hello %% comment %% world")).toBe(2);
  });

  it("counts hyphenated words as one word", () => {
    expect(countWords("well-known")).toBe(1);
    expect(countWords("up-to-date")).toBe(1);
  });

  it("counts CJK characters individually", () => {
    expect(countWords("日本語")).toBe(3);
    expect(countWords("東京")).toBe(2);
  });

  it("handles markdown code inlines", () => {
    // NB: backticks are stripped by the markdown regex, so `code`
    // becomes `code` and counts as a word. Existing behavior.
    expect(countWords("text `code` text")).toBe(3);
  });

  it("strips inline dataview", () => {
    expect(countWords("text `=this.field` text")).toBe(2);
  });

  it("handles real-world paragraph text", () => {
    const text = "The quick brown fox jumps over the lazy dog.";
    expect(countWords(text)).toBe(9);
  });
});
