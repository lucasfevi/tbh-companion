import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bench, describe } from "vitest";
import { parseInventory, resolveInventory } from "../../src/core/inventory";
import { parseSnapshot } from "../../src/core/save/snapshot";
import { readAndDecrypt } from "../../src/main/io/saveFile";
import { es3Encrypt } from "./fixtures/es3Fixture";
import { loadCatalogLookup, loadGameDataIndex } from "./fixtures/catalog";
import { buildLargeSaveText } from "./fixtures/syntheticSave";

const saveText = buildLargeSaveText();
const encryptedSave = es3Encrypt(saveText);
const tempDir = mkdtempSync(join(tmpdir(), "tbh-bench-save-"));
const tempSavePath = join(tempDir, "SaveFile_Live.es3");
writeFileSync(tempSavePath, encryptedSave);
const lookup = loadCatalogLookup();

describe("startup bootstrap proxy", () => {
  bench("load gamedata index", () => {
    loadGameDataIndex();
  });

  bench("save pipeline (decrypt + parse + resolve)", () => {
    const { text, mtime } = readAndDecrypt(tempSavePath);
    parseSnapshot(text, mtime);
    const inventory = parseInventory(text, mtime);
    resolveInventory(inventory, lookup, true);
  });

  bench("bootstrap total (gamedata + save pipeline)", () => {
    loadGameDataIndex();
    const { text, mtime } = readAndDecrypt(tempSavePath);
    parseSnapshot(text, mtime);
    const inventory = parseInventory(text, mtime);
    resolveInventory(inventory, lookup, true);
  });
});

process.on("exit", () => {
  rmSync(tempDir, { recursive: true, force: true });
});
