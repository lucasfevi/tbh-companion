// Resumable, backoff-aware, rolling-refresh sweep of listed prices. The Steam
// call is injected (`fetchListedUsd`) so this stays pure and unit-testable.
//
// Steam imposes a per-IP quota (~hundreds of priceoverview calls per window) and
// blocks for hours once it's hit, so one CI run can't cover the whole catalog.
// Each run therefore fetches in priority order — missing hashes first, then the
// stalest already-priced hashes (oldest `fetchedUtc` first, gated by a minimum
// age) — and trips a circuit breaker after consecutive rate limits, persisting
// progress via `onProgress`. Across the scheduled runs this fills coverage and
// then continuously refreshes the oldest prices, so nothing goes stale forever.

export type ListedResult =
  | { ok: true; usd: number | null } // null = confirmed no active listing
  | { ok: false; rateLimited: boolean }; // rateLimited => retry after backoff

/** Prior/accumulated price data: the price map plus when each was last fetched. */
export interface PriceState {
  prices: Record<string, number | null>;
  fetchedUtc: Record<string, string>;
}

export interface SweepDeps {
  fetchListedUsd: (hash: string) => Promise<ListedResult>;
  sleep: (ms: number) => Promise<void>;
  /** Current time in epoch ms; injectable for deterministic tests. */
  now: () => number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Stop the whole sweep after this many consecutive rate limits (quota spent). */
  maxConsecutiveRateLimits?: number;
  /** Skip re-pricing already-priced hashes younger than this (ms). Missing hashes ignore it. */
  minRefreshAgeMs?: number;
  /** Called with the running state after each newly-priced hash, for incremental persistence. */
  onProgress?: (state: PriceState) => void;
  log?: (message: string) => void;
  isCancelled?: () => boolean;
}

const DEFAULT_BASE_DELAY_MS = 1500;
const DEFAULT_MAX_DELAY_MS = 30_000;
const DEFAULT_MAX_CONSECUTIVE_RATE_LIMITS = 6;
const DEFAULT_MIN_REFRESH_AGE_MS = 12 * 60 * 60 * 1000; // re-price entries older than 12h

/** Epoch ms a hash was last fetched, or 0 (treat as oldest) when unknown. */
function lastFetchedMs(hash: string, prior: PriceState): number {
  const iso = prior.fetchedUtc[hash];
  const parsed = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Fetch order: missing hashes first, then stale priced hashes oldest-first. */
function refreshOrder(
  hashes: string[],
  prior: PriceState,
  nowMs: number,
  minAgeMs: number,
): string[] {
  const missing: string[] = [];
  const stale: string[] = [];
  for (const hash of hashes) {
    if (!(hash in prior.prices)) {
      missing.push(hash);
      continue;
    }
    if (nowMs - lastFetchedMs(hash, prior) >= minAgeMs) stale.push(hash);
  }
  stale.sort((a, b) => lastFetchedMs(a, prior) - lastFetchedMs(b, prior));
  return [...missing, ...stale];
}

/**
 * Price `hashes` into a {@link PriceState}, seeded by `prior`. Fetches in
 * priority order (missing, then stale oldest-first) and stamps `fetchedUtc` on
 * each success. Backs off on rate limits and stops the sweep once they come
 * back-to-back (the IP quota is spent). Hashes whose fetch errors (not rate
 * limited) keep their prior value so the next run retries them.
 */
export async function sweepListedPrices(
  hashes: string[],
  prior: PriceState,
  deps: SweepDeps,
): Promise<PriceState> {
  const baseDelayMs = deps.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelayMs = deps.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const maxConsecutiveRateLimits =
    deps.maxConsecutiveRateLimits ?? DEFAULT_MAX_CONSECUTIVE_RATE_LIMITS;
  const minAgeMs = deps.minRefreshAgeMs ?? DEFAULT_MIN_REFRESH_AGE_MS;

  const prices: Record<string, number | null> = { ...prior.prices };
  const fetchedUtc: Record<string, string> = { ...prior.fetchedUtc };
  const order = refreshOrder(hashes, prior, deps.now(), minAgeMs);

  let delayMs = baseDelayMs;
  let consecutiveRateLimits = 0;

  for (let index = 0; index < order.length; ) {
    const hash = order[index];
    if (deps.isCancelled?.()) break;

    const response = await deps.fetchListedUsd(hash);

    if (!response.ok && response.rateLimited) {
      consecutiveRateLimits += 1;
      if (consecutiveRateLimits >= maxConsecutiveRateLimits) {
        deps.log?.(
          `stopping: ${consecutiveRateLimits} consecutive rate limits (quota likely spent); ` +
            `${Object.keys(prices).length} known, resume next run`,
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
      prices[hash] = response.usd;
      fetchedUtc[hash] = new Date(deps.now()).toISOString();
      deps.onProgress?.({ prices, fetchedUtc });
      deps.log?.(`priced ${hash} = ${response.usd ?? "no listing"}`);
    } else {
      deps.log?.(`failed ${hash}; will retry next run`);
    }

    index += 1;
    await deps.sleep(delayMs);
  }

  return { prices, fetchedUtc };
}
