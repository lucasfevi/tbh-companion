import { describe, it, expect } from "vitest";
import {
  aggregateSellerProceeds,
  buyerPriceFromSellerAmount,
  sellerProceedsFromBuyerPrice,
  TBH_MARKET_FEE_RATES,
} from "../../src/core/steamMarketFee";

describe("steamMarketFee", () => {
  it("computes buyer price from seller amount with TBH 5% rate", () => {
    expect(buyerPriceFromSellerAmount(1, TBH_MARKET_FEE_RATES)).toBeCloseTo(1.05);
  });

  it("inverts buyer price to seller proceeds", () => {
    expect(sellerProceedsFromBuyerPrice(1.05, TBH_MARKET_FEE_RATES)).toBeCloseTo(1.0, 2);
  });

  it("aggregates proceeds per stack line", () => {
    const result = aggregateSellerProceeds(
      [
        { buyerUnitPrice: 1.0, count: 2 },
        { buyerUnitPrice: 0.5, count: 1 },
      ],
      TBH_MARKET_FEE_RATES,
    );
    expect(result.grossTotal).toBeCloseTo(2.5);
    expect(result.netTotal).toBeLessThan(result.grossTotal);
    expect(result.feeTotal).toBeCloseTo(result.grossTotal - result.netTotal);
  });
});
