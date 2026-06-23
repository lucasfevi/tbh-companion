import { describe, expect, it } from "vitest";
import { loadOfferings } from "../../src/core/lookup/catalog";
import { offeringForCoin, offeringSourcesForItem } from "../../src/core/lookup/offerings";

describe("offerings catalog", () => {
  const model = loadOfferings();

  it("has 10 coins", () => {
    expect(model.length).toBe(10);
  });

  it("each coin has a non-empty loot table summing to ~100%", () => {
    for (const coin of model) {
      expect(coin.loot.length).toBeGreaterThan(0);
      const sum = coin.loot.reduce((a, e) => a + e.poolPct, 0);
      expect(Math.abs(sum - 100)).toBeLessThan(1);
    }
  });

  it("loot is sorted descending by poolPct", () => {
    for (const coin of model) {
      for (let i = 1; i < coin.loot.length; i++) {
        expect(coin.loot[i].poolPct).toBeLessThanOrEqual(coin.loot[i - 1].poolPct);
      }
    }
  });

  it("offeringForCoin finds a coin by key and returns null for unknown keys", () => {
    const coin = offeringForCoin(model, 160001);
    expect(coin?.coinKey).toBe(160001);
    expect(offeringForCoin(model, 999999)).toBeNull();
  });

  it("offeringSourcesForItem reverse-looks-up coins that can yield a known loot item, sorted desc", () => {
    const coin1 = offeringForCoin(model, 160001)!;
    const topItem = coin1.loot[0];
    const sources = offeringSourcesForItem(model, topItem.itemKey);
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.some((s) => s.coinKey === 160001 && s.poolPct === topItem.poolPct)).toBe(true);
    for (let i = 1; i < sources.length; i++) {
      expect(sources[i].poolPct).toBeLessThanOrEqual(sources[i - 1].poolPct);
    }
  });

  it("offeringSourcesForItem returns an empty array for an item no coin can yield", () => {
    expect(offeringSourcesForItem(model, -1)).toEqual([]);
  });
});
