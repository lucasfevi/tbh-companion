import { describe, it, expect } from "vitest";
import {
  marketPriceShowsDual,
  marketPriceTooltip,
} from "../../src/renderer/lib/marketPriceDisplay";

describe("marketPriceShowsDual", () => {
  it("is true when median and lowest differ", () => {
    expect(marketPriceShowsDual("$15.42", "$714.15")).toBe(true);
  });

  it("is false when only one price is present", () => {
    expect(marketPriceShowsDual("$1.00", null)).toBe(false);
    expect(marketPriceShowsDual(null, "$1.00")).toBe(false);
  });

  it("is false when both match", () => {
    expect(marketPriceShowsDual("$0.04", "$0.04")).toBe(false);
  });
});

describe("marketPriceTooltip", () => {
  it("describes both prices when dual", () => {
    expect(marketPriceTooltip("$15.42", "$714.15", "USD")).toBe(
      "Recent sale median: $15.42\nLowest listing: $714.15",
    );
    expect(marketPriceTooltip("$15.42", "$1234.56", "USD")).toBe(
      "Recent sale median: $15.42\nLowest listing: $1,234.56",
    );
  });

  it("describes single median or lowest", () => {
    expect(marketPriceTooltip("$1.00", null, "USD")).toBe("Recent sale median on Steam Market");
    expect(marketPriceTooltip(null, "$1.00", "USD")).toBe(
      "Lowest listing (no recent sales on Steam)",
    );
  });
});
