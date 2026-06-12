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

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function sleepUntil(ms: number, isCancelled: () => boolean): Promise<void> {
  const step = 100;
  let left = ms;
  while (left > 0 && !isCancelled()) {
    await sleep(Math.min(step, left));
    left -= step;
  }
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
    const e = this.cache.prices[name];
    if (!e) return false;
    return now - Date.parse(e.fetchedUtc) < FRESH_TTL_MS;
  }

  pendingNames(names: string[], force = false, now = Date.now()): string[] {
    if (force) return names.slice();
    return names.filter((n) => !this.isFresh(n, now));
  }

  /** Remove cache entries not in the current owned set. Returns count removed. */
  pruneCache(ownedNames: string[]): number {
    const owned = new Set(ownedNames);
    let removed = 0;
    for (const key of Object.keys(this.cache.prices)) {
      if (!owned.has(key)) {
        delete this.cache.prices[key];
        removed++;
      }
    }
    if (removed > 0) {
      persistPriceCache(this.cache);
      log.info(`Pruned ${removed} orphan cache entries`);
    }
    return removed;
  }

  status(ownedNames?: string[]): PriceStatus {
    const now = Date.now();
    const owned = ownedNames ?? [];
    let freshCount = 0;
    let staleCount = 0;
    for (const name of owned) {
      if (this.isFresh(name, now)) freshCount++;
      else staleCount++;
    }
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
    opts: {
      force?: boolean;
      onProgress?: (p: PriceProgress) => void;
      onPriced?: (name: string) => void;
      onFinished?: (result: PriceRefreshResult) => void;
    } = {},
  ): Promise<PriceRefreshResult> {
    if (this.running) {
      return {
        ok: false,
        priced: 0,
        skipped: 0,
        failed: 0,
        stopped: "cancelled",
        currency: this.currency,
        error: "already running",
      };
    }

    this.running = true;
    this.cancelled = false;
    const allTargets = (names && names.length ? names : []).slice();

    let result: PriceRefreshResult = {
      ok: true,
      priced: 0,
      skipped: 0,
      failed: 0,
      stopped: "completed",
      currency: this.currency,
    };

    try {
      if (allTargets.length === 0) {
        return result;
      }

      const force = Boolean(opts.force);
      const pending = this.pendingNames(allTargets, force);
      if (!force && pending.length === 0) {
        result = {
          ok: true,
          priced: 0,
          skipped: allTargets.length,
          failed: 0,
          stopped: "completed",
          currency: this.currency,
          noop: true,
        };
        return result;
      }

      log.info(
        `Refresh start currency=${this.currency} targets=${allTargets.length} stale=${pending.length} force=${force}`,
      );

      const now = Date.now();
      let priced = 0;
      let skipped = 0;
      let failed = 0;
      let delay = DEFAULT_DELAY_MS;
      let stopped: PriceRefreshResult["stopped"] = "completed";
      let sawRateLimit = false;

      for (let i = 0; i < allTargets.length; i++) {
        if (this.cancelled) {
          stopped = "cancelled";
          break;
        }

        const name = allTargets[i];
        if (!force && this.isFresh(name, now)) {
          skipped++;
          opts.onProgress?.({
            done: i + 1,
            total: allTargets.length,
            current: name,
            priced,
            failed,
          });
          continue;
        }

        try {
          const r = await fetchSteamPrice(name, this.currency);
          if (r.status === 0) {
            log.warn(`Fetch timeout ${name}`);
            failed++;
          } else if (r.status === 429) {
            sawRateLimit = true;
            delay = Math.min(delay * 2, MAX_DELAY_MS);
            log.warn(`Rate-limited ${name} backoff=${Math.round(delay / 1000)}s`);
            i--;
            opts.onProgress?.({
              done: i + 1,
              total: allTargets.length,
              current: `${name} (rate-limited, waiting ${Math.round(delay / 1000)}s)`,
              priced,
              failed,
            });
            await sleepUntil(delay, () => this.cancelled);
            if (this.cancelled) {
              stopped = "cancelled";
              break;
            }
            continue;
          } else {
            delay = DEFAULT_DELAY_MS;
            if (r.ok && r.entry) {
              this.cache.prices[name] = r.entry;
              priced++;
              opts.onPriced?.(name);
            } else {
              failed++;
            }
          }
        } catch {
          failed++;
        }

        opts.onProgress?.({ done: i + 1, total: allTargets.length, current: name, priced, failed });
        if (priced > 0 && priced % 5 === 0) persistPriceCache(this.cache);
        await sleepUntil(delay, () => this.cancelled);
      }

      if (sawRateLimit && stopped === "completed" && priced === 0 && failed > 0) {
        stopped = "rate-limited";
      }

      if (priced > 0) this.cache.fetchedUtc = new Date().toISOString();
      persistPriceCache(this.cache);
      result = { ok: true, priced, skipped, failed, stopped, currency: this.currency };
      log.info(`Refresh ${stopped}: priced=${priced} failed=${failed} skipped=${skipped}`);
      return result;
    } catch (err) {
      persistPriceCache(this.cache);
      result = {
        ok: false,
        priced: result.priced,
        skipped: result.skipped,
        failed: result.failed,
        stopped: result.stopped,
        currency: this.currency,
        error: (err as Error).message,
      };
      log.warn(`Refresh failed: ${result.error ?? "unknown"}`);
      return result;
    } finally {
      this.running = false;
      opts.onFinished?.(result);
    }
  }
}
