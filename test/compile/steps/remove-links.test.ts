import { describe, expect, it } from "vitest";
import {
  replaceWikiLinks,
  replaceExternalLinks,
} from "src/compile/steps/remove-links";

describe("Removing Links", () => {
  it("removes wiki links", () => {
    expect(replaceWikiLinks("[[Filename]]")).toEqual("Filename");
    expect(replaceWikiLinks("[[Filename]] and [[other filename]]")).toEqual(
      "Filename and other filename"
    );
    expect(replaceWikiLinks("[[Filename]]\n[[Other filename]]")).toEqual(
      "Filename\nOther filename"
    );
    expect(replaceWikiLinks("[[Filename|Alias]]")).toEqual("Alias");
    expect(replaceWikiLinks("[[Filename#^blockId|Alias]]")).toEqual("Alias");
    expect(replaceWikiLinks("[[Filename#^blockId]]")).toEqual(
      "Filename#^blockId"
    );
    expect(replaceWikiLinks("[[Some/Path/To/Filename|Filename]]")).toEqual(
      "Filename"
    );
    expect(replaceWikiLinks("[[]]")).toEqual("[[]]");
    expect(
      replaceWikiLinks("[[link]] followed by a single end bracket]")
    ).toEqual("link followed by a single end bracket]");
    expect(
      replaceWikiLinks("[[Filename|Alias|OtherAlias|Another Alias]]")
    ).toEqual("AliasOtherAliasAnother Alias");
  });

  it("removes external links", () => {
    expect(
      replaceExternalLinks("[Filename](Some/Path/To/Filename.md)")
    ).toEqual("Filename");
    expect(
      replaceExternalLinks(
        "[Filename](Some/Path/To/Filename.md) and [Other Filename](Some/Path/To/Other%20Filename.md)"
      )
    ).toEqual("Filename and Other Filename");
    expect(
      replaceExternalLinks(
        "[Filename](Some/Path/To/Filename.md)\n[Other Filename](Some/Path/To/Other%20Filename.md)"
      )
    ).toEqual("Filename\nOther Filename");
    expect(replaceExternalLinks("[Alias](Some/Path/To/Filename.md)")).toEqual(
      "Alias"
    );
    expect(
      replaceExternalLinks("[Alias](Some/Path/To/Filename.md#^blockId)")
    ).toEqual("Alias");
    expect(
      replaceExternalLinks("[Filename] (Some/Path/To/Filename.md)")
    ).toEqual("[Filename] (Some/Path/To/Filename.md)");
    expect(replaceExternalLinks("[Filename Some/Path/To/Filename.md)")).toEqual(
      "[Filename Some/Path/To/Filename.md)"
    );
  });

  it("does not remove embeds", () => {
    expect(replaceWikiLinks("![[Filename]]")).toEqual("![[Filename]]");
    expect(replaceWikiLinks("![[Filename]][[Other filename]]")).toEqual(
      "![[Filename]]Other filename"
    );
    expect(replaceWikiLinks("[[Filename]]![[Other filename]]")).toEqual(
      "Filename![[Other filename]]"
    );

    expect(
      replaceExternalLinks("![Filename](Some/Path/To/Filename.md)")
    ).toEqual("![Filename](Some/Path/To/Filename.md)");
    expect(
      replaceExternalLinks(
        "![Filename](Some/Path/To/Filename.md)[Filename](Some/Path/To/Filename.md)"
      )
    ).toEqual("![Filename](Some/Path/To/Filename.md)Filename");
    expect(
      replaceExternalLinks(
        "[Filename](Some/Path/To/Filename.md)![Filename](Some/Path/To/Filename.md)"
      )
    ).toEqual("Filename![Filename](Some/Path/To/Filename.md)");
  });
});
