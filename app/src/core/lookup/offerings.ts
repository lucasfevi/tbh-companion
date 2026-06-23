import type { OfferingEntry, OfferingsModel, OfferingSource } from "../../../shared/types";

export function offeringForCoin(model: OfferingsModel, coinKey: number): OfferingEntry | null {
  return model.find((entry) => entry.coinKey === coinKey) ?? null;
}

/** Reverse lookup: which coins can yield this item, and at what chance — sorted desc. */
export function offeringSourcesForItem(model: OfferingsModel, itemKey: number): OfferingSource[] {
  const sources: OfferingSource[] = [];
  for (const coin of model) {
    const entry = coin.loot.find((l) => l.itemKey === itemKey);
    if (entry) sources.push({ coinKey: coin.coinKey, poolPct: entry.poolPct });
  }
  return sources.toSorted((a, b) => b.poolPct - a.poolPct);
}
