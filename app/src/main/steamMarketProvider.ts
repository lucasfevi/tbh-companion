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

export { FRESH_TTL_MS };
export type { PriceEntry };

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

  status(): PriceStatus {
    return {
      currency: this.currency,
      count: Object.keys(this.cache.prices).length,
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
      onFinished?: () => void;
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
    if (allTargets.length === 0) {
      this.running = false;
      return {
        ok: true,
        priced: 0,
        skipped: 0,
        failed: 0,
        stopped: "completed",
        currency: this.currency,
      };
    }

    const now = Date.now();
    let priced = 0;
    let skipped = 0;
    let failed = 0;
    let delay = DEFAULT_DELAY_MS;
    let stopped: PriceRefreshResult["stopped"] = "completed";

    try {
      for (let i = 0; i < allTargets.length; i++) {
        if (this.cancelled) {
          stopped = "cancelled";
          break;
        }

        const name = allTargets[i];
        if (!opts.force && this.isFresh(name, now)) {
          skipped++;
          opts.onProgress?.({ done: i + 1, total: allTargets.length, current: name, priced, failed });
          continue;
        }

        try {
          const r = await fetchSteamPrice(name, this.currency);
          if (r.status === 429) {
            delay = Math.min(delay * 2, MAX_DELAY_MS);
            i--;
            opts.onProgress?.({
              done: i + 1,
              total: allTargets.length,
              current: `${name} (rate-limited, waiting ${Math.round(delay / 1000)}s)`,
              priced,
              failed,
            });
            await sleepUntil(delay, () => this.cancelled);
            continue;
          }

          delay = DEFAULT_DELAY_MS;
          if (r.ok && r.entry) {
            this.cache.prices[name] = r.entry;
            priced++;
            opts.onPriced?.(name);
          } else {
            failed++;
          }
        } catch {
          failed++;
        }

        opts.onProgress?.({ done: i + 1, total: allTargets.length, current: name, priced, failed });
        if (priced > 0 && priced % 5 === 0) persistPriceCache(this.cache);
        await sleepUntil(delay, () => this.cancelled);
      }

      if (priced > 0) this.cache.fetchedUtc = new Date().toISOString();
      persistPriceCache(this.cache);
      return { ok: true, priced, skipped, failed, stopped, currency: this.currency };
    } catch (err) {
      persistPriceCache(this.cache);
      return {
        ok: false,
        priced,
        skipped,
        failed,
        stopped,
        currency: this.currency,
        error: (err as Error).message,
      };
    } finally {
      this.running = false;
      opts.onFinished?.();
    }
  }
}
