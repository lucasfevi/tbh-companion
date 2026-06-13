import { bench, describe } from "vitest";
import { parseInventory, resolveInventory } from "../../src/core/inventory";
import type { InventoryPriceInfo } from "../../shared/types";
import { loadCatalogLookup } from "./fixtures/catalog";
import { buildLargeSaveText } from "./fixtures/syntheticSave";

const saveText = buildLargeSaveText();
const lookup = loadCatalogLookup();
const priceCache = new Map<string, InventoryPriceInfo>();

const seedSnapshot = parseInventory(saveText, 1_700_000_000);
const seedResolved = resolveInventory(seedSnapshot, lookup, true);
seedResolved.rows.slice(0, Math.ceil(seedResolved.rows.length * 0.1)).forEach((row) => {
  if (row.marketHashName) {
    priceCache.set(row.marketHashName, {
      lowest: 1.5,
      median: 2,
      rawLowest: "$1.50",
      rawMedian: "$2.00",
    });
  }
});

function priceLookup(marketHashName: string): InventoryPriceInfo | undefined {
  return priceCache.get(marketHashName);
}

describe("inventory resolve", () => {
  bench("parseInventory (1500 items)", () => {
    parseInventory(saveText, 1_700_000_000);
  });

  bench("resolveInventory (1500 items, 10% priced)", () => {
    const snapshot = parseInventory(saveText, 1_700_000_000);
    resolveInventory(snapshot, lookup, true, priceLookup);
  });
});
