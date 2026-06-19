// Fetch highest buy order via Steam itemordershistogram.

import { currencyCode, parseMinorUnits, parseMoney, TBH_STEAM_APP_ID } from "../../core/steamPrice";

const HISTOGRAM = "https://steamcommunity.com/market/itemordershistogram";

export interface BuyOrderLevel {
  price: number;
  quantity: number;
}

export interface BuyOrderFetchResult {
  ok: boolean;
  status: number;
  buyOrder?: number | null;
  rawBuyOrder?: string | null;
  /** Units available at the highest buy price (top of buyOrderLevels). */
  buyOrderQuantity?: number | null;
  /** Full buy-side order book, sorted descending by price. */
  buyOrderLevels?: BuyOrderLevel[] | null;
}

function parseQuantityString(raw: string | null | undefined): number | null {
  if (!raw?.trim()) return null;
  const n = Number(raw.replace(/[^0-9]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

/** Parse the full buy-side order book from histogram JSON, sorted descending by price. */
export function parseBuyOrderLevels(data: {
  buy_order_table?: Array<{ price?: string; quantity?: string }> | null;
  buy_order_graph?: Array<[number, number, string]> | null;
}): BuyOrderLevel[] {
  const table = data.buy_order_table;
  if (Array.isArray(table) && table.length > 0) {
    const levels = table
      .map((row) => ({ price: parseMoney(row.price), quantity: parseQuantityString(row.quantity) }))
      .filter(
        (level): level is BuyOrderLevel =>
          level.price != null && level.price > 0 && level.quantity != null && level.quantity > 0,
      );
    if (levels.length > 0) return levels.sort((a, b) => b.price - a.price);
  }

  const graph = data.buy_order_graph;
  if (!Array.isArray(graph) || graph.length === 0) return [];

  const points = graph
    .filter(
      (point): point is [number, number, string] =>
        Array.isArray(point) &&
        point.length >= 2 &&
        typeof point[0] === "number" &&
        typeof point[1] === "number" &&
        point[1] > 0,
    )
    .sort((a, b) => b[0] - a[0]);

  let previousCumulative = 0;
  return points
    .map(([price, cumulativeQty]) => {
      const quantity = Math.max(0, Math.trunc(cumulativeQty - previousCumulative));
      previousCumulative = cumulativeQty;
      return { price, quantity };
    })
    .filter((level) => level.quantity > 0);
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
  const buyOrderLevels = parseBuyOrderLevels(data);

  return {
    ok: true,
    status: res.status,
    buyOrder: buyOrder != null && buyOrder > 0 ? buyOrder : null,
    rawBuyOrder: buyOrder != null && rawBuyOrder ? rawBuyOrder : null,
    buyOrderQuantity: buyOrderLevels[0]?.quantity ?? null,
    buyOrderLevels: buyOrderLevels.length > 0 ? buyOrderLevels : null,
  };
}
