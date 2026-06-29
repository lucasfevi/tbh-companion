// Resumable, backoff-aware sweep of listed prices. The actual Steam call is
// injected (`fetchListedUsd`) so this stays pure and unit-testable; the build
// script supplies the real network fetch. Mirrors the owned-inventory provider's
// 429 backoff, but listed-price only (no buy orders) and resumable across runs.
//
// Steam imposes a per-IP quota (~hundreds of priceoverview calls per window) and
// blocks for hours once it's hit. A single CI run can't cover the whole catalog,
// so the sweep trips a circuit breaker after a run of consecutive rate limits,
// persists progress via `onProgress`, and returns what it has — the next
// scheduled run resumes from the published partial snapshot.

export type ListedResult =
  | { ok: true; usd: number | null } // null = confirmed no active listing
  | { ok: false; rateLimited: boolean }; // rateLimited => retry after backoff

export interface SweepDeps {
  fetchListedUsd: (hash: string) => Promise<ListedResult>;
  sleep: (ms: number) => Promise<void>;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Stop the whole sweep after this many consecutive rate limits (quota spent). */
  maxConsecutiveRateLimits?: number;
  /** Called with the running map after each newly-priced hash, for incremental persistence. */
  onProgress?: (priced: Record<string, number | null>) => void;
  log?: (message: string) => void;
  isCancelled?: () => boolean;
}

const DEFAULT_BASE_DELAY_MS = 1500;
const DEFAULT_MAX_DELAY_MS = 30_000;
const DEFAULT_MAX_CONSECUTIVE_RATE_LIMITS = 6;

/**
 * Price `hashes` into a `hash -> usd|null` map, seeded by `priced` (already-done
 * hashes from a prior run are skipped — resume). Backs off exponentially on rate
 * limits and retries the same hash, but stops the whole sweep once rate limits
 * come back-to-back (the IP quota is spent — further calls are futile). Hashes
 * whose fetch errors (not rate-limited) are left absent so the next run retries.
 */
export async function sweepListedPrices(
  hashes: string[],
  priced: Record<string, number | null>,
  deps: SweepDeps,
): Promise<Record<string, number | null>> {
  const baseDelayMs = deps.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelayMs = deps.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const maxConsecutiveRateLimits =
    deps.maxConsecutiveRateLimits ?? DEFAULT_MAX_CONSECUTIVE_RATE_LIMITS;
  const result: Record<string, number | null> = { ...priced };
  let delayMs = baseDelayMs;
  let consecutiveRateLimits = 0;

  for (let index = 0; index < hashes.length; ) {
    const hash = hashes[index];
    if (deps.isCancelled?.()) break;
    if (hash in result) {
      index++;
      continue;
    }

    const response = await deps.fetchListedUsd(hash);

    if (!response.ok && response.rateLimited) {
      consecutiveRateLimits += 1;
      if (consecutiveRateLimits >= maxConsecutiveRateLimits) {
        deps.log?.(
          `stopping: ${consecutiveRateLimits} consecutive rate limits (quota likely spent); ` +
            `${Object.keys(result).length} resolved, resume next run`,
        );
        break;
      }
      delayMs = Math.min(delayMs * 2, maxDelayMs);
      deps.log?.(
        `rate-limited ${hash}; backing off ${Math.round(delayMs / 1000)}s ` +
          `(${consecutiveRateLimits}/${maxConsecutiveRateLimits})`,
      );
      await deps.sleep(delayMs);
      continue; // retry the same hash after backing off
    }

    consecutiveRateLimits = 0;
    delayMs = baseDelayMs;
    if (response.ok) {
      result[hash] = response.usd;
      deps.onProgress?.(result);
      deps.log?.(`priced ${hash} = ${response.usd ?? "no listing"}`);
    } else {
      deps.log?.(`failed ${hash}; will retry next run`);
    }

    index += 1;
    await deps.sleep(delayMs);
  }

  return result;
}
