// Resolve a catalog item against the price snapshot for display in the renderer.
// Pure: hash derivation (shared with the Action), FX conversion, and money
// formatting. No network, no React.

import type { LookupPriceSnapshot, ResolvedLookupPrice } from "../../../shared/types";
import { marketHashName, type MarketHashItem } from "../marketName";
import { formatMoney, steamMarketListingUrl } from "../steamPrice";

const NOT_TRADABLE: ResolvedLookupPrice = {
  hash: null,
  state: "not-tradable",
  usd: null,
  amount: null,
  display: null,
  listingUrl: null,
};

/**
 * Resolve `item` to a displayable price in `currency`:
 * - not-tradable / no derivable hash → no price affordance
 * - tradable but no USD listing in the snapshot → "no-listing" (still links out)
 * - priced → USD × FX rate, formatted; falls back to USD when the rate is missing
 */
export function resolveLookupPrice(
  item: MarketHashItem,
  snapshot: LookupPriceSnapshot | null,
  currency: string,
): ResolvedLookupPrice {
  const hash = marketHashName(item);
  if (!hash) return NOT_TRADABLE;

  const listingUrl = steamMarketListingUrl(hash);
  const usd = snapshot?.prices[hash] ?? null;
  if (usd == null) {
    return { hash, state: "no-listing", usd: null, amount: null, display: null, listingUrl };
  }

  const code = currency.toUpperCase();
  const rate = snapshot?.fx[code] ?? (code === "USD" ? 1 : null);
  const displayCurrency = rate == null ? "USD" : code;
  const amount = usd * (rate ?? 1);

  return {
    hash,
    state: "priced",
    usd,
    amount,
    display: formatMoney(amount, displayCurrency),
    listingUrl,
  };
}
