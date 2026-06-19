// Steam Community Market seller fee math (buyer listing price → wallet proceeds).
// Pure — no node:fs/bundled-data imports, so it's safe to import from the renderer too.
// For the bundled TBH fee override, see steamMarketFeeBundled.ts (main/core only).

export interface SteamMarketFeeRates {
  steamFeePercent: number;
  publisherFeePercent: number;
  /** Minimum per fee component in major currency units (e.g. 0.01 USD). */
  minFeeMajor: number;
}

/** Fallback when bundled data/steam_market_fee.json is missing. */
export const TBH_MARKET_FEE_RATES: SteamMarketFeeRates = {
  steamFeePercent: 0.05,
  publisherFeePercent: 0,
  minFeeMajor: 0.01,
};

function roundFee(amount: number, rate: number, minFee: number): number {
  const raw = Math.floor(amount * rate * 100) / 100;
  return Math.max(raw, minFee);
}

/** Fees deducted from seller proceeds for one sale at receive-amount `sellerAmount`. */
export function sellerFees(sellerAmount: number, rates: SteamMarketFeeRates): number {
  if (sellerAmount <= 0) return 0;
  const steam = roundFee(sellerAmount, rates.steamFeePercent, rates.minFeeMajor);
  const pub =
    rates.publisherFeePercent > 0
      ? roundFee(sellerAmount, rates.publisherFeePercent, rates.minFeeMajor)
      : 0;
  return steam + pub;
}

/** Buyer price when seller lists to receive `sellerAmount`. */
export function buyerPriceFromSellerAmount(
  sellerAmount: number,
  rates: SteamMarketFeeRates,
): number {
  if (sellerAmount <= 0) return 0;
  return sellerAmount + sellerFees(sellerAmount, rates);
}

/**
 * Inverse: wallet proceeds when a buyer pays `buyerPrice` on a listing.
 * Binary search — Steam floors fees on seller amount.
 */
export function sellerProceedsFromBuyerPrice(
  buyerPrice: number,
  rates: SteamMarketFeeRates,
): number {
  if (buyerPrice <= 0 || !Number.isFinite(buyerPrice)) return 0;

  let lo = 0;
  let hi = buyerPrice;
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    const buyer = buyerPriceFromSellerAmount(mid, rates);
    if (buyer > buyerPrice) hi = mid;
    else lo = mid;
  }
  return Math.round(lo * 100) / 100;
}

export interface SellerProceedsLine {
  buyerUnitPrice: number;
  count: number;
}

export interface SellerProceedsAggregate {
  grossTotal: number;
  netTotal: number;
  feeTotal: number;
}

/** Sum net proceeds per stack line (each unit sold at buyer price). */
export function aggregateSellerProceeds(
  lines: SellerProceedsLine[],
  rates: SteamMarketFeeRates,
): SellerProceedsAggregate {
  let grossTotal = 0;
  let netTotal = 0;

  for (const line of lines) {
    if (line.count <= 0 || line.buyerUnitPrice == null || !Number.isFinite(line.buyerUnitPrice)) {
      continue;
    }
    const unitNet = sellerProceedsFromBuyerPrice(line.buyerUnitPrice, rates);
    grossTotal += line.buyerUnitPrice * line.count;
    netTotal += unitNet * line.count;
  }

  const feeTotal = Math.max(0, grossTotal - netTotal);
  return { grossTotal, netTotal, feeTotal };
}
