// Fetch highest buy order via Steam itemordershistogram.

import { currencyCode, parseMinorUnits, parseMoney, TBH_STEAM_APP_ID } from "../../core/steamPrice";

const HISTOGRAM = "https://steamcommunity.com/market/itemordershistogram";

export interface BuyOrderFetchResult {
  ok: boolean;
  status: number;
  buyOrder?: number | null;
  rawBuyOrder?: string | null;
}

export async function fetchSteamBuyOrder(
  itemNameId: number,
  marketHashName: string,
  currency: string,
): Promise<BuyOrderFetchResult> {
  const params = new URLSearchParams({
    norender: "1",
    country: "US",
    language: "english",
    currency: String(currencyCode(currency)),
    item_nameid: String(itemNameId),
    two_factor: "0",
  });
  const listingUrl = `https://steamcommunity.com/market/listings/${TBH_STEAM_APP_ID}/${encodeURIComponent(marketHashName)}`;
  let res: Response;
  try {
    res = await fetch(`${HISTOGRAM}?${params}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (TBH Companion)",
        Referer: listingUrl,
      },
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return { ok: false, status: 0 };
  }
  if (!res.ok) return { ok: false, status: res.status };

  const data = (await res.json()) as {
    success?: number;
    highest_buy_order?: string;
    buy_order_price?: string;
  };
  if (data.success !== 1) return { ok: false, status: res.status };

  const rawBuyOrder = data.buy_order_price?.trim() || null;
  const fromText = parseMoney(rawBuyOrder);
  const fromMinor = parseMinorUnits(data.highest_buy_order ?? null);
  const buyOrder = fromText ?? fromMinor;

  return {
    ok: true,
    status: res.status,
    buyOrder: buyOrder != null && buyOrder > 0 ? buyOrder : null,
    rawBuyOrder: buyOrder != null && rawBuyOrder ? rawBuyOrder : null,
  };
}
