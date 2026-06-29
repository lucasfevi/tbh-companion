// Orchestrates a full snapshot build: derive hashes, sweep listed prices, fetch
// FX, and assemble the JSON. Network is injected via `deps`, so the whole build
// is unit-testable without hitting Steam or an FX endpoint.

import type { GameItem } from "../gamedata";
import type { LookupPriceSnapshot } from "../../../shared/types";
import { buildSnapshot, priceableHashes } from "./snapshot";
import { sweepListedPrices, type ListedResult, type PriceState } from "./sweep";

export interface AssembleDeps {
  fetchListedUsd: (hash: string) => Promise<ListedResult>;
  fetchFxRates: () => Promise<Record<string, number>>;
  sleep: (ms: number) => Promise<void>;
  /** Prior run's prices + timestamps, to resume and roll the refresh frontier. */
  resume?: PriceState;
  /** Prior run's FX, used if a fresh fetch fails. */
  resumeFx?: Record<string, number>;
  baseDelayMs?: number;
  maxDelayMs?: number;
  maxConsecutiveRateLimits?: number;
  minRefreshAgeMs?: number;
  /** Called with the running state after each newly-priced hash. */
  onProgress?: (state: PriceState) => void;
  /** Current time in epoch ms. */
  now?: () => number;
  log?: (message: string) => void;
}

const emptyState = (): PriceState => ({ prices: {}, fetchedUtc: {} });

/** Build a complete {@link LookupPriceSnapshot} from the catalog. */
export async function assembleSnapshot(
  items: GameItem[],
  deps: AssembleDeps,
): Promise<LookupPriceSnapshot> {
  const hashes = priceableHashes(items);
  deps.log?.(`deriving prices for ${hashes.length} hashes`);

  const swept = await sweepListedPrices(hashes, deps.resume ?? emptyState(), {
    fetchListedUsd: deps.fetchListedUsd,
    sleep: deps.sleep,
    now: deps.now ?? Date.now,
    baseDelayMs: deps.baseDelayMs,
    maxDelayMs: deps.maxDelayMs,
    maxConsecutiveRateLimits: deps.maxConsecutiveRateLimits,
    minRefreshAgeMs: deps.minRefreshAgeMs,
    onProgress: deps.onProgress,
    log: deps.log,
  });

  const fx = await fetchFxWithFallback(deps);

  return buildSnapshot({ prices: swept.prices, fetchedUtc: swept.fetchedUtc, fx, now: deps.now });
}

async function fetchFxWithFallback(deps: AssembleDeps): Promise<Record<string, number>> {
  try {
    const fx = await deps.fetchFxRates();
    if (Object.keys(fx).length > 0) return fx;
    deps.log?.("FX fetch returned no rates; using prior rates");
  } catch (err) {
    deps.log?.(`FX fetch failed (${(err as Error).message}); using prior rates`);
  }
  return deps.resumeFx ?? {};
}
