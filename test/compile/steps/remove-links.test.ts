import { describe, expect, it } from 'vitest'
import { replaceWikiLinks, replaceExternalLinks } from '../../../src/compile/steps/remove-links'

describe("Removing Links", () => {

    it("removes wiki links", () => {
        expect(replaceWikiLinks("[[Filename]]")).toEqual("Filename")
        expect(replaceWikiLinks("[[Filename]] and [[other filename]]")).toEqual("Filename and other filename")
        expect(replaceWikiLinks("[[Filename]]\n[[Other filename]]")).toEqual("Filename\nOther filename")
        expect(replaceWikiLinks("[[Filename|Alias]]")).toEqual("Alias")
        expect(replaceWikiLinks("[[Filename#^blockId|Alias]]")).toEqual("Alias")
        expect(replaceWikiLinks("[[Some/Path/To/Filename|Filename]]")).toEqual("Filename")
    })

    it("removes external links", () => {
        expect(replaceExternalLinks("[Filename](Some/Path/To/Filename.md)")).toEqual("Filename")
        expect(replaceExternalLinks("[Filename](Some/Path/To/Filename.md) and [Other Filename](Some/Path/To/Other%20Filename.md)"))
            .toEqual("Filename and Other Filename")
        expect(replaceExternalLinks("[Filename](Some/Path/To/Filename.md)\n[Other Filename](Some/Path/To/Other%20Filename.md)"))
            .toEqual("Filename\nOther Filename")
        expect(replaceExternalLinks("[Alias](Some/Path/To/Filename.md)")).toEqual("Alias")
        expect(replaceExternalLinks("[Alias](Some/Path/To/Filename.md#^blockId)")).toEqual("Alias")
    })

})