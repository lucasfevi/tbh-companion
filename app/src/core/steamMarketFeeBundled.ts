// Loads TBH's bundled Steam Market fee override (node:fs — main/core only, not renderer-safe).

import { readBundledJson } from "./bundledData";
import { TBH_MARKET_FEE_RATES, type SteamMarketFeeRates } from "./steamMarketFee";

let cachedTbhMarketFeeRates: SteamMarketFeeRates | null = null;

/** TBH seller fee rates from bundled data/steam_market_fee.json (falls back to {@link TBH_MARKET_FEE_RATES}). */
export function getTbhMarketFeeRates(): SteamMarketFeeRates {
  if (cachedTbhMarketFeeRates) return cachedTbhMarketFeeRates;
  try {
    const raw = readBundledJson<SteamMarketFeeRates & { note?: string }>("steam_market_fee.json");
    cachedTbhMarketFeeRates = {
      steamFeePercent: raw.steamFeePercent,
      publisherFeePercent: raw.publisherFeePercent,
      minFeeMajor: raw.minFeeMajor,
    };
  } catch {
    cachedTbhMarketFeeRates = TBH_MARKET_FEE_RATES;
  }
  return cachedTbhMarketFeeRates;
}
