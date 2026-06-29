// Pure helpers for the Lookup price snapshot: derive the priceable hash set and
// assemble the final JSON shape. No network, no Electron — safe to run in the
// GitHub Action (via tsx) and to unit-test.

import type { GameItem } from "../gamedata";
import { marketHashName } from "../marketName";
import type { LookupPriceSnapshot } from "../../../shared/types";

/**
 * Unique `market_hash_name`s for every priceable catalog item (tradable +
 * derivable). Reuses `marketName` so the Action and the client never drift.
 */
export function priceableHashes(items: GameItem[]): string[] {
  const seen = new Set<string>();
  for (const item of items) {
    const hash = marketHashName(item);
    if (hash) seen.add(hash);
  }
  return [...seen];
}

export interface SnapshotParts {
  /** market_hash_name -> USD lowest listing; null = confirmed no active listing. */
  prices: Record<string, number | null>;
  /** market_hash_name -> ISO time the price was last fetched. */
  fetchedUtc: Record<string, string>;
  /** ISO currency -> units per 1 USD. */
  fx: Record<string, number>;
  /** Current time in epoch ms; defaults to now, injectable for deterministic tests. */
  now?: () => number;
}

/** Assemble the snapshot JSON from already-fetched prices, timestamps, and FX. */
export function buildSnapshot(parts: SnapshotParts): LookupPriceSnapshot {
  const nowMs = (parts.now ?? Date.now)();
  return {
    schemaVersion: 1,
    generatedUtc: new Date(nowMs).toISOString(),
    baseCurrency: "USD",
    prices: parts.prices,
    fetchedUtc: parts.fetchedUtc,
    fx: parts.fx,
  };
}
