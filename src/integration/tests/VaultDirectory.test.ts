import { normalizePath, type App } from "obsidian";
import { VaultDirectory } from "../../utils/VaultDirectory";
import { directoryContract } from "../contracts/directory-contract";
import type IntegrationTestFramework from "../framework";

export function vaultDirectoryTest(
  framework: IntegrationTestFramework,
  app: App
) {
  framework.describe(`Vault Directory`, () => {
    framework.afterAll(async () => {
      const paths = await app.vault.adapter.list(normalizePath("/"));

      const allFilesAndFolders = paths.files.concat(paths.folders);

      for (const path of allFilesAndFolders) {
        if (path.startsWith("/int_test_") || path.startsWith("int_test_")) {
          await app.vault.delete(app.vault.getAbstractFileByPath(path), true);
        }
      }
    });

    directoryContract(framework).test(
      () => new VaultDirectory(app),
      "int_test_"
    );
  });
}
