import { describe, it, expect } from "vitest";
import { instantSellValue } from "../../src/core/inventory/buyOrder";

describe("instantSellValue", () => {
  it("walks multiple levels when the top level doesn't cover the stack", () => {
    const result = instantSellValue(12, [
      { price: 0.03, quantity: 2 },
      { price: 0.02, quantity: 10 },
      { price: 0.01, quantity: 100 },
    ]);
    expect(result.value).toBeCloseTo(0.03 * 2 + 0.02 * 10);
    expect(result.coveredCount).toBe(12);
  });

  it("uses full stack when the top level alone covers it", () => {
    const result = instantSellValue(1, [{ price: 0.03, quantity: 5 }]);
    expect(result.value).toBeCloseTo(0.03);
    expect(result.coveredCount).toBe(1);
  });

  it("sorts levels regardless of input order", () => {
    const result = instantSellValue(3, [
      { price: 0.01, quantity: 100 },
      { price: 0.03, quantity: 2 },
    ]);
    expect(result.value).toBeCloseTo(0.03 * 2 + 0.01 * 1);
    expect(result.coveredCount).toBe(3);
  });

  it("caps coveredCount when the whole book still falls short", () => {
    const result = instantSellValue(10, [{ price: 0.03, quantity: 2 }]);
    expect(result.value).toBeCloseTo(0.06);
    expect(result.coveredCount).toBe(2);
  });

  it("returns null value when levels are unknown or empty", () => {
    expect(instantSellValue(5, null)).toEqual({ value: null, coveredCount: 0 });
    expect(instantSellValue(5, []).value).toBeNull();
    expect(instantSellValue(5, undefined).value).toBeNull();
  });

  it("returns null for invalid inputs", () => {
    expect(instantSellValue(0, [{ price: 0.03, quantity: 2 }]).value).toBeNull();
  });
});
