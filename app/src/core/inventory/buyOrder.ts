import type { BuyOrderLevel } from "../../../shared/types";

export interface InstantSellResult {
  value: number | null;
  /** Units actually sellable across all known levels, capped at ownedCount. */
  coveredCount: number;
}

/** Wallet proceeds from selling into the order book level-by-level, best price first. */
export function instantSellValue(
  ownedCount: number,
  levels: BuyOrderLevel[] | null | undefined,
): InstantSellResult {
  if (ownedCount <= 0 || !levels?.length) return { value: null, coveredCount: 0 };

  const sorted = [...levels].sort((a, b) => b.price - a.price);
  let remaining = ownedCount;
  let proceeds = 0;
  for (const level of sorted) {
    if (remaining <= 0) break;
    if (!Number.isFinite(level.price) || level.price <= 0) continue;
    const qty = Math.max(0, Math.trunc(level.quantity));
    const take = Math.min(remaining, qty);
    proceeds += take * level.price;
    remaining -= take;
  }

  const coveredCount = ownedCount - remaining;
  return { value: coveredCount > 0 ? proceeds : null, coveredCount };
}
