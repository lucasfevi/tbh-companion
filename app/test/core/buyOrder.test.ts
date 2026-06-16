import { describe, it, expect } from "vitest";
import { instantSellValue } from "../../src/core/inventory/buyOrder";

describe("instantSellValue", () => {
  it("caps proceeds at order-book depth", () => {
    expect(instantSellValue(0.03, 10, 2)).toBeCloseTo(0.06);
  });

  it("uses full stack when depth exceeds count", () => {
    expect(instantSellValue(0.03, 1, 5)).toBeCloseTo(0.03);
  });

  it("returns null when depth is unknown or zero", () => {
    expect(instantSellValue(0.03, 5, null)).toBeNull();
    expect(instantSellValue(0.03, 5, 0)).toBeNull();
    expect(instantSellValue(0.03, 5, undefined)).toBeNull();
  });

  it("returns null for invalid inputs", () => {
    expect(instantSellValue(0, 5, 2)).toBeNull();
    expect(instantSellValue(0.03, 0, 2)).toBeNull();
  });
});
