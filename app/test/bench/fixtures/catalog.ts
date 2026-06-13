import { readFileSync } from "node:fs";
import { join } from "node:path";
import { indexById, type GameData, type GameItem } from "../../../src/core/gamedata";

const bundledGameDataPath = join(__dirname, "../../../../data/gamedata.json");

let cachedLookup: ((itemKey: number) => GameItem | undefined) | null = null;
let cachedItemKeys: number[] | null = null;

export function loadCatalogLookup(): (itemKey: number) => GameItem | undefined {
  if (cachedLookup) return cachedLookup;
  const data = JSON.parse(readFileSync(bundledGameDataPath, "utf-8")) as GameData;
  const index = indexById(data.items);
  cachedLookup = (itemKey) => index.get(itemKey);
  return cachedLookup;
}

/** Sample tradable item keys from the bundled catalog for synthetic saves. */
export function sampleItemKeys(count: number): number[] {
  if (cachedItemKeys) return cachedItemKeys.slice(0, count);
  const data = JSON.parse(readFileSync(bundledGameDataPath, "utf-8")) as GameData;
  cachedItemKeys = data.items
    .filter((item) => item.marketTradable && item.type !== "STAGEBOX")
    .map((item) => item.id);
  return cachedItemKeys.slice(0, count);
}

export function loadGameDataIndex(): Map<number, GameItem> {
  const data = JSON.parse(readFileSync(bundledGameDataPath, "utf-8")) as GameData;
  return indexById(data.items);
}
