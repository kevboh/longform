import * as vitest from "vitest";
import { InMemoryFileSystem } from "./FakeDirectory";
import { directoryContract } from "src/integration/contracts/directory-contract";

vitest.describe(`In-Memory File System`, () => {
  directoryContract(vitest).test(() => new InMemoryFileSystem());
});
