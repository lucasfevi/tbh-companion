// Steam Market price provider.
//
// Prices a list of market_hash_names via the priceoverview endpoint, which is
// the only one that honors a chosen currency (see docs/findings/steam-market.md).
// Per-item and rate-limited, so refresh is manual (a button), throttled, and
// INCREMENTAL: names priced within the freshness TTL are skipped, so repeated
// runs only re-fetch stale/missing entries. Prices are cached per-currency in
// userData/prices.<ISO>.json.

import { app } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { currencyCode, parseMoney } from "../core/steamPrice";
import type {
  PriceStatus,
  PriceProgress,
  PriceRefreshResult,
} from "../../shared/types";

const APP_ID = 3678970;
const PRICEOVERVIEW = "https://steamcommunity.com/market/priceoverview/";
const DEFAULT_DELAY_MS = 1500;
const MAX_DELAY_MS = 15000;
const FRESH_TTL_MS = 24 * 60 * 60 * 1000; // re-price names older than a day
const MAX_CONSECUTIVE_429 = 4;

export interface PriceEntry {
  lowest: number | null;
  median: number | null;
  volume: number;
  raw: string | null; // raw lowest_price text for display
  fetchedUtc: string;
}

interface PriceCache {
  currency: string;
  fetchedUtc: string | null;
  prices: Record<string, PriceEntry>;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export class SteamMarketProvider {
  private currency: string;
  private cache: PriceCache;
  private running = false;
  private cancelled = false;

  constructor(currency: string) {
    this.currency = currency.toUpperCase();
    this.cache = this.loadCache(this.currency);
  }

  private cachePath(currency: string): string {
    const file = `prices.${currency.toUpperCase()}.json`;
    try {
      return join(app.getPath("userData"), file);
    } catch {
      return join(process.cwd(), file);
    }
  }

  private loadCache(currency: string): PriceCache {
    const path = this.cachePath(currency);
    if (existsSync(path)) {
      try {
        const raw = readFileSync(path, "utf-8").replace(/^\uFEFF/, "");
        const c = JSON.parse(raw) as PriceCache;
        if (c && typeof c.prices === "object") return c;
      } catch {
        // fall through
      }
    }
    return { currency: currency.toUpperCase(), fetchedUtc: null, prices: {} };
  }

  private persist(): void {
    const path = this.cachePath(this.currency);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(this.cache));
  }

  /** Switch currency; loads that currency's separate cache. */
  setCurrency(currency: string): void {
    const next = currency.toUpperCase();
    if (next === this.currency) return;
    this.currency = next;
    this.cache = this.loadCache(next);
  }

  get(name: string): PriceEntry | undefined {
    return this.cache.prices[name];
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

  /** Names from the bundled marketable catalog (fallback target until inventory wiring). */
  catalogNames(): string[] {
    const candidates = [
      join(process.resourcesPath ?? "", "data", "steam_market_catalog.json"),
      join(process.cwd(), "..", "data", "steam_market_catalog.json"),
      join(process.cwd(), "data", "steam_market_catalog.json"),
    ];
    const path = candidates.find((p) => existsSync(p));
    if (!path) return [];
    try {
      const raw = readFileSync(path, "utf-8").replace(/^\uFEFF/, "");
      const j = JSON.parse(raw) as {
        items: { market_hash_name: string }[];
      };
      return [...new Set(j.items.map((i) => i.market_hash_name))];
    } catch {
      return [];
    }
  }

  private async fetchOne(name: string): Promise<{ ok: boolean; status: number; entry?: PriceEntry }> {
    const url =
      `${PRICEOVERVIEW}?appid=${APP_ID}&currency=${currencyCode(this.currency)}` +
      `&market_hash_name=${encodeURIComponent(name)}`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (TBH Companion)" } });
    if (!res.ok) return { ok: false, status: res.status };
    const data = (await res.json()) as {
      success?: boolean;
      lowest_price?: string;
      median_price?: string;
      volume?: string;
    };
    if (!data.success) return { ok: false, status: res.status };
    return {
      ok: true,
      status: res.status,
      entry: {
        lowest: parseMoney(data.lowest_price),
        median: parseMoney(data.median_price),
        volume: data.volume ? Number(data.volume.replace(/[^0-9]/g, "")) : 0,
        raw: data.lowest_price ?? data.median_price ?? null,
        fetchedUtc: new Date().toISOString(),
      },
    };
  }

  /**
   * Refresh prices for `names` (defaults to the marketable catalog) in the
   * current currency. Skips fresh entries unless `force`. Reports progress.
   */
  async refresh(
    names: string[] | undefined,
    opts: { force?: boolean; onProgress?: (p: PriceProgress) => void } = {},
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

    const targets = (names && names.length ? names : this.catalogNames()).slice();
    const now = Date.now();
    let priced = 0;
    let skipped = 0;
    let failed = 0;
    let consecutive429 = 0;
    let delay = DEFAULT_DELAY_MS;
    let stopped: PriceRefreshResult["stopped"] = "completed";

    try {
      for (let i = 0; i < targets.length; i++) {
        if (this.cancelled) {
          stopped = "cancelled";
          break;
        }
        const name = targets[i];
        const existing = this.cache.prices[name];
        if (!opts.force && existing && now - Date.parse(existing.fetchedUtc) < FRESH_TTL_MS) {
          skipped++;
          opts.onProgress?.({ done: i + 1, total: targets.length, current: name, priced, failed });
          continue;
        }

        try {
          const r = await this.fetchOne(name);
          if (r.status === 429) {
            consecutive429++;
            delay = Math.min(delay * 2, MAX_DELAY_MS);
            if (consecutive429 >= MAX_CONSECUTIVE_429) {
              stopped = "rate-limited";
              break;
            }
            i--; // retry this name after the backoff sleep
            await sleep(delay);
            continue;
          }
          consecutive429 = 0;
          delay = DEFAULT_DELAY_MS;
          if (r.ok && r.entry) {
            this.cache.prices[name] = r.entry;
            priced++;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }

        opts.onProgress?.({ done: i + 1, total: targets.length, current: name, priced, failed });
        if (priced % 10 === 0) this.persist(); // checkpoint periodically
        await sleep(delay);
      }

      if (priced > 0) this.cache.fetchedUtc = new Date().toISOString();
      this.persist();
      return { ok: true, priced, skipped, failed, stopped, currency: this.currency };
    } catch (err) {
      this.persist();
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
    }
  }
}
