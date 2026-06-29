// Resumable, backoff-aware sweep of listed prices. The actual Steam call is
// injected (`fetchListedUsd`) so this stays pure and unit-testable; the build
// script supplies the real network fetch. Mirrors the owned-inventory provider's
// 429 backoff, but listed-price only (no buy orders) and resumable across runs.

export type ListedResult =
  | { ok: true; usd: number | null } // null = confirmed no active listing
  | { ok: false; rateLimited: boolean }; // rateLimited => retry after backoff

export interface SweepDeps {
  fetchListedUsd: (hash: string) => Promise<ListedResult>;
  sleep: (ms: number) => Promise<void>;
  baseDelayMs?: number;
  maxDelayMs?: number;
  log?: (message: string) => void;
  isCancelled?: () => boolean;
}

const DEFAULT_BASE_DELAY_MS = 1500;
const DEFAULT_MAX_DELAY_MS = 60_000;

/**
 * Price `hashes` into a `hash -> usd|null` map, seeded by `priced` (already-done
 * hashes from a prior run are skipped — resume). Backs off exponentially on rate
 * limits and retries the same hash. Hashes whose fetch errors (not rate-limited)
 * are left absent so the next run retries them.
 */
export async function sweepListedPrices(
  hashes: string[],
  priced: Record<string, number | null>,
  deps: SweepDeps,
): Promise<Record<string, number | null>> {
  const baseDelayMs = deps.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelayMs = deps.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const result: Record<string, number | null> = { ...priced };
  let delayMs = baseDelayMs;

  for (let index = 0; index < hashes.length; ) {
    const hash = hashes[index];
    if (deps.isCancelled?.()) break;
    if (hash in result) {
      index++;
      continue;
    }

    const response = await deps.fetchListedUsd(hash);

    if (!response.ok && response.rateLimited) {
      delayMs = Math.min(delayMs * 2, maxDelayMs);
      deps.log?.(`rate-limited ${hash}; backing off ${Math.round(delayMs / 1000)}s`);
      await deps.sleep(delayMs);
      continue; // retry the same hash after backing off
    }

    if (response.ok) {
      result[hash] = response.usd;
      deps.log?.(`priced ${hash} = ${response.usd ?? "no listing"}`);
    } else {
      deps.log?.(`failed ${hash}; will retry next run`);
    }

    delayMs = baseDelayMs;
    index++;
    await deps.sleep(delayMs);
  }

  return result;
}
