// See docs for `input` and `context` types and expected return type.
async function compile(input, context) {
  const text = context.optionValues["to-add"];
  const append = context.optionValues["append"];

  if (context.kind === "Scene") {
    return input.map((sceneInput) => {
      return {
        ...sceneInput,
        contents: append ? sceneInput.contents + text : text + sceneInput.contents,
      };
    });
  } else {
    return {
      ...input,
      contents: append ? input.contents + text : text + input.contents
    };
  }
}

module.exports = {
  description: {
    name: "Example User Script",
    description: "Appends or prepends some test text.",
    availableKinds: ["Scene", "Manuscript"],
    options: [
      {
        id: "to-add",
        name: "Text to append or prepend",
        description: "Will be appended or prepended to the scene or manuscript, to demonstrate user steps.",
        type: "Text",
        default: "\n\nText added in user script."
      },
      {
        id: "append",
        name: "Append",
        description: "If true, prepend the above text value. If false, prepend it.",
        type: "Boolean",
        default: true
      }
    ]
  },
  compile: compile
};
