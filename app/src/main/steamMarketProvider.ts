// Steam Market price provider — orchestrates cache + API fetches.

import type { PriceStatus, PriceProgress, PriceRefreshResult } from "../../shared/types";
import {
  type PriceEntry,
  type PriceCache,
  loadPriceCache,
  persistPriceCache,
} from "./services/priceCache";
import { fetchSteamPrice } from "./services/steamPriceApi";
import { FRESH_TTL_MS } from "./services/steamMarketConstants";
import { createLogger } from "./log";

export { FRESH_TTL_MS };
export type { PriceEntry };

const log = createLogger("market");

const DEFAULT_DELAY_MS = 1500;
const MAX_DELAY_MS = 60000;
const PERSIST_EVERY_PRICED = 5;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function sleepUntil(ms: number, isCancelled: () => boolean): Promise<void> {
  const step = 100;
  let remaining = ms;
  while (remaining > 0 && !isCancelled()) {
    await sleep(Math.min(step, remaining));
    remaining -= step;
  }
}

type RefreshCallbacks = {
  force?: boolean;
  onProgress?: (progress: PriceProgress) => void;
  onPriced?: (name: string) => void;
  onFinished?: (result: PriceRefreshResult) => void;
};

type RefreshCounters = {
  priced: number;
  skipped: number;
  failed: number;
};

type FetchStep = "advance" | "retry";

function emptyRefreshResult(currency: string): PriceRefreshResult {
  return {
    ok: true,
    priced: 0,
    skipped: 0,
    failed: 0,
    stopped: "completed",
    currency,
  };
}

function countOwnedFreshness(
  ownedNames: string[],
  isFresh: (name: string, now: number) => boolean,
  now: number,
): Pick<PriceStatus, "freshCount" | "staleCount"> {
  return ownedNames.reduce(
    (counts, name) => {
      if (isFresh(name, now)) counts.freshCount++;
      else counts.staleCount++;
      return counts;
    },
    { freshCount: 0, staleCount: 0 },
  );
}

function finalizeStopped(
  counters: RefreshCounters,
  sawRateLimit: boolean,
  cancelled: boolean,
): PriceRefreshResult["stopped"] {
  if (cancelled) return "cancelled";
  if (sawRateLimit && counters.priced === 0 && counters.failed > 0) return "rate-limited";
  return "completed";
}

export class SteamMarketProvider {
  private currency: string;
  private cache: PriceCache;
  private running = false;
  private cancelled = false;

  constructor(currency: string) {
    this.currency = currency.toUpperCase();
    this.cache = loadPriceCache(this.currency);
  }

  setCurrency(currency: string): void {
    const next = currency.toUpperCase();
    if (next === this.currency) return;
    this.currency = next;
    this.cache = loadPriceCache(next);
  }

  /** Reload in-memory cache after price files were deleted from disk. */
  reloadFromDisk(): void {
    this.cache = loadPriceCache(this.currency);
  }

  get(name: string): PriceEntry | undefined {
    return this.cache.prices[name];
  }

  isFresh(name: string, now = Date.now()): boolean {
    const entry = this.cache.prices[name];
    if (!entry) return false;
    return now - Date.parse(entry.fetchedUtc) < FRESH_TTL_MS;
  }

  pendingNames(names: string[], force = false, now = Date.now()): string[] {
    if (force) return names.slice();
    return names.filter((name) => !this.isFresh(name, now));
  }

  /** Remove cache entries not in the current owned set. Returns count removed. */
  pruneCache(ownedNames: string[]): number {
    const owned = new Set(ownedNames);
    let removed = 0;
    for (const key of Object.keys(this.cache.prices)) {
      if (owned.has(key)) continue;
      delete this.cache.prices[key];
      removed++;
    }
    if (removed === 0) return 0;
    persistPriceCache(this.cache);
    log.info(`Pruned ${removed} orphan cache entries`);
    return removed;
  }

  status(ownedNames?: string[]): PriceStatus {
    const now = Date.now();
    const owned = ownedNames ?? [];
    const { freshCount, staleCount } = countOwnedFreshness(
      owned,
      (name) => this.isFresh(name, now),
      now,
    );
    return {
      currency: this.currency,
      count: owned.length > 0 ? freshCount + staleCount : Object.keys(this.cache.prices).length,
      ownedTargets: owned.length,
      freshCount,
      staleCount,
      fetchedUtc: this.cache.fetchedUtc,
      running: this.running,
    };
  }

  cancel(): void {
    this.cancelled = true;
  }

  async refresh(
    names: string[] | undefined,
    opts: RefreshCallbacks = {},
  ): Promise<PriceRefreshResult> {
    if (this.running) {
      return {
        ...emptyRefreshResult(this.currency),
        ok: false,
        stopped: "cancelled",
        error: "already running",
      };
    }

    const targets = names?.length ? names.slice() : [];
    let result = emptyRefreshResult(this.currency);

    this.running = true;
    this.cancelled = false;

    try {
      if (targets.length === 0) return result;

      const force = Boolean(opts.force);
      const staleTargets = this.pendingNames(targets, force);
      if (!force && staleTargets.length === 0) {
        result = { ...emptyRefreshResult(this.currency), skipped: targets.length, noop: true };
        return result;
      }

      log.info(
        `Refresh start currency=${this.currency} targets=${targets.length} stale=${staleTargets.length} force=${force}`,
      );

      const counters = await this.fetchAllTargets(targets, force, opts);
      const stopped = finalizeStopped(counters, counters.sawRateLimit, this.cancelled);

      if (counters.priced > 0) this.cache.fetchedUtc = new Date().toISOString();
      persistPriceCache(this.cache);

      result = {
        ok: true,
        priced: counters.priced,
        skipped: counters.skipped,
        failed: counters.failed,
        stopped,
        currency: this.currency,
      };
      log.info(
        `Refresh ${stopped}: priced=${counters.priced} failed=${counters.failed} skipped=${counters.skipped}`,
      );
      return result;
    } catch (err) {
      persistPriceCache(this.cache);
      result = {
        ...result,
        ok: false,
        error: (err as Error).message,
      };
      log.warn(`Refresh failed: ${result.error ?? "unknown"}`);
      return result;
    } finally {
      this.running = false;
      opts.onFinished?.(result);
    }
  }

  private async fetchAllTargets(
    targets: string[],
    force: boolean,
    opts: RefreshCallbacks,
  ): Promise<RefreshCounters & { sawRateLimit: boolean }> {
    const now = Date.now();
    const counters: RefreshCounters = { priced: 0, skipped: 0, failed: 0 };
    let delayMs = DEFAULT_DELAY_MS;
    let sawRateLimit = false;

    for (let index = 0; index < targets.length; ) {
      if (this.cancelled) break;

      const name = targets[index];
      if (!force && this.isFresh(name, now)) {
        counters.skipped++;
        this.emitProgress(opts, targets.length, index + 1, name, counters);
        index++;
        continue;
      }

      const step = await this.priceOneTarget(name, counters, opts);
      if (step === "retry") {
        sawRateLimit = true;
        delayMs = Math.min(delayMs * 2, MAX_DELAY_MS);
        log.warn(`Rate-limited ${name} backoff=${Math.round(delayMs / 1000)}s`);
        this.emitProgress(
          opts,
          targets.length,
          index + 1,
          `${name} (rate-limited, waiting ${Math.round(delayMs / 1000)}s)`,
          counters,
        );
        await sleepUntil(delayMs, () => this.cancelled);
        continue;
      }

      delayMs = DEFAULT_DELAY_MS;
      this.emitProgress(opts, targets.length, index + 1, name, counters);
      if (counters.priced > 0 && counters.priced % PERSIST_EVERY_PRICED === 0) {
        persistPriceCache(this.cache);
      }
      await sleepUntil(delayMs, () => this.cancelled);
      index++;
    }

    return { ...counters, sawRateLimit };
  }

  private async priceOneTarget(
    name: string,
    counters: RefreshCounters,
    opts: RefreshCallbacks,
  ): Promise<FetchStep> {
    try {
      const response = await fetchSteamPrice(name, this.currency);
      if (response.status === 0) {
        log.warn(`Fetch timeout ${name}`);
        counters.failed++;
        return "advance";
      }
      if (response.status === 429) return "retry";
      if (response.ok && response.entry) {
        this.cache.prices[name] = response.entry;
        counters.priced++;
        opts.onPriced?.(name);
        return "advance";
      }
      counters.failed++;
      return "advance";
    } catch {
      counters.failed++;
      return "advance";
    }
  }

  private emitProgress(
    opts: RefreshCallbacks,
    total: number,
    done: number,
    current: string,
    counters: RefreshCounters,
  ): void {
    opts.onProgress?.({
      done,
      total,
      current,
      priced: counters.priced,
      failed: counters.failed,
    });
  }
}
