// Fetch highest buy order via Steam itemordershistogram.

import { currencyCode, parseMinorUnits, parseMoney, TBH_STEAM_APP_ID } from "../../core/steamPrice";

const HISTOGRAM = "https://steamcommunity.com/market/itemordershistogram";

export interface BuyOrderFetchResult {
  ok: boolean;
  status: number;
  buyOrder?: number | null;
  rawBuyOrder?: string | null;
  /** Units available at the highest buy price (from histogram order book). */
  buyOrderQuantity?: number | null;
}

function parseQuantityString(raw: string | null | undefined): number | null {
  if (!raw?.trim()) return null;
  const n = Number(raw.replace(/[^0-9]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

/** Parse top-of-book buy order quantity from histogram JSON. */
export function parseBuyOrderQuantity(data: {
  buy_order_table?: Array<{ price?: string; quantity?: string }> | null;
  buy_order_graph?: Array<[number, number, string]> | null;
}): number | null {
  const table = data.buy_order_table;
  if (Array.isArray(table) && table.length > 0) {
    const fromTable = parseQuantityString(table[0]?.quantity);
    if (fromTable != null) return fromTable;
  }

  const graph = data.buy_order_graph;
  if (!Array.isArray(graph) || graph.length === 0) return null;

  let top: { price: number; qty: number } | null = null;
  for (const point of graph) {
    if (!Array.isArray(point) || point.length < 2) continue;
    const price = point[0];
    const qty = point[1];
    if (typeof price !== "number" || typeof qty !== "number" || qty <= 0) continue;
    if (!top || price > top.price) top = { price, qty };
  }
  return top ? Math.trunc(top.qty) : null;
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
    buy_order_table?: Array<{ price?: string; quantity?: string }>;
    buy_order_graph?: Array<[number, number, string]>;
  };
  if (data.success !== 1) return { ok: false, status: res.status };

  const rawBuyOrder = data.buy_order_price?.trim() || null;
  const fromText = parseMoney(rawBuyOrder);
  const fromMinor = parseMinorUnits(data.highest_buy_order ?? null);
  const buyOrder = fromText ?? fromMinor;
  const buyOrderQuantity = parseBuyOrderQuantity(data);

  return {
    ok: true,
    status: res.status,
    buyOrder: buyOrder != null && buyOrder > 0 ? buyOrder : null,
    rawBuyOrder: buyOrder != null && rawBuyOrder ? rawBuyOrder : null,
    buyOrderQuantity,
  };
}
