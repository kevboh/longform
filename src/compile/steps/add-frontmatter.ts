import { CompileStepKind, CompileStepOptionType, makeBuiltinStep, type CompileContext, type CompileManuscriptInput } from "./abstract-compile-step";

export const AddFrontmatterStep = makeBuiltinStep({
    id: "add-frontmatter",
    description: {
        name: "Add Frontmatter",
        description: "Add YAML frontmatter to your manuscript",
        availableKinds: [CompileStepKind.Manuscript],
        options: [
            {
                id: "frontmatter",
                name: "Frontmatter",
                description: "YAML to be added to your manuscript's frontmatter.",
                type: CompileStepOptionType.MultilineText,
                default: "",
            }
        ]
    },
    compile(input: CompileManuscriptInput, context: CompileContext): CompileManuscriptInput {
        if (context.kind !== CompileStepKind.Manuscript) {
          throw new Error("Cannot add frontmatter to non-manuscript.");
        }

        const contents = [
            "---",
            context.optionValues["frontmatter"] as string,
            "---",
            input.contents,
        ].join("\n");

        return {
            contents,
        }
    }
})
