import { currencyCode, parseMoney } from "../../core/steamPrice";
import type { PriceEntry } from "./priceCache";

const APP_ID = 3678970;
const PRICEOVERVIEW = "https://steamcommunity.com/market/priceoverview/";

export type SteamPriceFailReason = "network" | "http" | "no_listing" | "no_sell_price";

export type SteamPriceFetchResult =
  | { ok: true; status: number; entry: PriceEntry }
  | { ok: false; status: number; reason: SteamPriceFailReason; entry?: PriceEntry };

export function describeSteamPriceFailure(
  result: Extract<SteamPriceFetchResult, { ok: false }>,
): string {
  switch (result.reason) {
    case "network":
      return "network error or timeout";
    case "http":
      return `HTTP ${result.status}`;
    case "no_listing":
      return "no Steam market listing (success=false)";
    case "no_sell_price":
      return "no median or lowest sell price in response";
  }
}

function entryHasSellPrice(entry: PriceEntry): boolean {
  return entry.median != null || entry.lowest != null;
}

export async function fetchSteamPrice(
  name: string,
  currency: string,
): Promise<SteamPriceFetchResult> {
  const url =
    `${PRICEOVERVIEW}?appid=${APP_ID}&currency=${currencyCode(currency)}` +
    `&market_hash_name=${encodeURIComponent(name)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (TBH Companion)" },
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return { ok: false, status: 0, reason: "network" };
  }
  if (!res.ok) return { ok: false, status: res.status, reason: "http" };

  const fetchedUtc = new Date().toISOString();
  const data = (await res.json()) as {
    success?: boolean;
    lowest_price?: string;
    median_price?: string;
    volume?: string;
  };
  if (!data.success) {
    return {
      ok: false,
      status: res.status,
      reason: "no_listing",
      entry: buildEntry(data, fetchedUtc),
    };
  }

  const entry = buildEntry(data, fetchedUtc);
  if (!entryHasSellPrice(entry)) {
    return { ok: false, status: res.status, reason: "no_sell_price", entry };
  }

  return { ok: true, status: res.status, entry };
}

function buildEntry(
  data: { lowest_price?: string; median_price?: string; volume?: string },
  fetchedUtc: string,
): PriceEntry {
  return {
    lowest: parseMoney(data.lowest_price),
    median: parseMoney(data.median_price),
    volume: data.volume ? Number(data.volume.replace(/[^0-9]/g, "")) : 0,
    rawLowest: data.lowest_price ?? null,
    rawMedian: data.median_price ?? null,
    fetchedUtc,
    buyOrder: null,
    rawBuyOrder: null,
  };
}
