import { app } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { BuyOrderLevel } from "../../../shared/types";

export interface PriceEntry {
  lowest: number | null;
  median: number | null;
  volume: number;
  rawLowest: string | null;
  rawMedian: string | null;
  fetchedUtc: string;
  buyOrder: number | null;
  rawBuyOrder: string | null;
  /** Units at the highest buy price when histogram was last fetched. */
  buyOrderQuantity?: number | null;
  /** Full buy-side order book when histogram was last fetched, sorted descending by price. */
  buyOrderLevels?: BuyOrderLevel[] | null;
  /** True after a successful itemordershistogram response (including zero buy orders). */
  buyOrderFetched?: boolean;
  /** ISO timestamp of last successful histogram fetch; gates cache freshness. */
  buyOrderCheckUtc?: string;
}

export interface PriceCache {
  currency: string;
  fetchedUtc: string | null;
  prices: Record<string, PriceEntry>;
}

export function priceCachePath(currency: string): string {
  const file = `prices.${currency.toUpperCase()}.json`;
  try {
    return join(app.getPath("userData"), file);
  } catch {
    return join(process.cwd(), file);
  }
}

export function loadPriceCache(currency: string): PriceCache {
  const path = priceCachePath(currency);
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

export function persistPriceCache(cache: PriceCache): void {
  const path = priceCachePath(cache.currency);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(cache));
}
