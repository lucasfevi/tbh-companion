import { existsSync } from "node:fs";
import { bench, describe } from "vitest";
import { parseInventory, resolveInventory } from "../../src/core/inventory";
import { parseSnapshot } from "../../src/core/save/snapshot";
import { readAndDecrypt } from "../../src/main/io/saveFile";
import { loadCatalogLookup } from "./fixtures/catalog";

const savePath = process.env.TBH_BENCH_SAVE_PATH ?? "";
const run = savePath && existsSync(savePath) ? describe : describe.skip;

run("real save (local only)", () => {
  const lookup = loadCatalogLookup();

  bench("decrypt + parseSnapshot", () => {
    const { text, mtime } = readAndDecrypt(savePath);
    parseSnapshot(text, mtime);
  });

  bench("parseInventory + resolveInventory", () => {
    const { text, mtime } = readAndDecrypt(savePath);
    const snapshot = parseInventory(text, mtime);
    resolveInventory(snapshot, lookup, true);
  });
});
