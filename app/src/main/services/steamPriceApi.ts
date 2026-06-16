import { currencyCode, parseMoney } from "../../core/steamPrice";
import type { PriceEntry } from "./priceCache";

const APP_ID = 3678970;
const PRICEOVERVIEW = "https://steamcommunity.com/market/priceoverview/";

export async function fetchSteamPrice(
  name: string,
  currency: string,
): Promise<{ ok: boolean; status: number; entry?: PriceEntry }> {
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
    return { ok: false, status: 0 };
  }
  if (!res.ok) return { ok: false, status: res.status };

  const data = (await res.json()) as {
    success?: boolean;
    lowest_price?: string;
    median_price?: string;
    volume?: string;
  };
  if (!data.success) return { ok: false, status: res.status };

  const fetchedUtc = new Date().toISOString();
  return {
    ok: true,
    status: res.status,
    entry: {
      lowest: parseMoney(data.lowest_price),
      median: parseMoney(data.median_price),
      volume: data.volume ? Number(data.volume.replace(/[^0-9]/g, "")) : 0,
      rawLowest: data.lowest_price ?? null,
      rawMedian: data.median_price ?? null,
      fetchedUtc,
      buyOrder: null,
      rawBuyOrder: null,
    },
  };
}
