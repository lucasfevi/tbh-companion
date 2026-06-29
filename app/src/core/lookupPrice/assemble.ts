// Orchestrates a full snapshot build: derive hashes, sweep listed prices, fetch
// FX, and assemble the JSON. Network is injected via `deps`, so the whole build
// is unit-testable without hitting Steam or an FX endpoint.

import type { GameItem } from "../gamedata";
import type { LookupPriceSnapshot } from "../../../shared/types";
import { buildSnapshot, priceableHashes } from "./snapshot";
import { sweepListedPrices, type ListedResult } from "./sweep";

export interface AssembleDeps {
  fetchListedUsd: (hash: string) => Promise<ListedResult>;
  fetchFxRates: () => Promise<Record<string, number>>;
  sleep: (ms: number) => Promise<void>;
  /** Prior run's prices, to resume an interrupted/partial sweep. */
  resumePrices?: Record<string, number | null>;
  /** Prior run's FX, used if a fresh fetch fails. */
  resumeFx?: Record<string, number>;
  baseDelayMs?: number;
  maxDelayMs?: number;
  maxConsecutiveRateLimits?: number;
  /** Called with the running price map after each newly-priced hash. */
  onProgress?: (priced: Record<string, number | null>) => void;
  now?: () => string;
  log?: (message: string) => void;
}

/** Build a complete {@link LookupPriceSnapshot} from the catalog. */
export async function assembleSnapshot(
  items: GameItem[],
  deps: AssembleDeps,
): Promise<LookupPriceSnapshot> {
  const hashes = priceableHashes(items);
  deps.log?.(`deriving prices for ${hashes.length} hashes`);

  const prices = await sweepListedPrices(hashes, deps.resumePrices ?? {}, {
    fetchListedUsd: deps.fetchListedUsd,
    sleep: deps.sleep,
    baseDelayMs: deps.baseDelayMs,
    maxDelayMs: deps.maxDelayMs,
    maxConsecutiveRateLimits: deps.maxConsecutiveRateLimits,
    onProgress: deps.onProgress,
    log: deps.log,
  });

  const fx = await fetchFxWithFallback(deps);

  return buildSnapshot({ prices, fx, now: deps.now });
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
