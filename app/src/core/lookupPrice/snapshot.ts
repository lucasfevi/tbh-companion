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
  /** ISO currency -> units per 1 USD. */
  fx: Record<string, number>;
  /** Defaults to the current time; injectable for deterministic tests. */
  now?: () => string;
}

/** Assemble the snapshot JSON from already-fetched prices and FX rates. */
export function buildSnapshot(parts: SnapshotParts): LookupPriceSnapshot {
  const now = parts.now ?? (() => new Date().toISOString());
  return {
    schemaVersion: 1,
    generatedUtc: now(),
    baseCurrency: "USD",
    prices: parts.prices,
    fx: parts.fx,
  };
}
