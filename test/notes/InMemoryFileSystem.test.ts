import { describe } from "vitest";
import { directoryContract } from "./directory-contract";
import { InMemoryFileSystem } from "./FakeDirectory";

describe(`In-Memory File System`, () => {
  directoryContract(() => new InMemoryFileSystem());
});
