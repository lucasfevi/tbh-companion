import { describe, it, expect } from "vitest";
import { parseMoney, currencyCode, currencyByIso, currencyPrefix, formatMoney } from "../src/core/steamPrice";

describe("parseMoney", () => {
  it("parses US-format prices", () => {
    expect(parseMoney("$0.04")).toBeCloseTo(0.04);
    expect(parseMoney("$1,234.56")).toBeCloseTo(1234.56);
  });

  it("parses comma-decimal prices (BRL/EUR)", () => {
    expect(parseMoney("R$ 0,17")).toBeCloseTo(0.17);
    expect(parseMoney("1.234,56 zl")).toBeCloseTo(1234.56);
    expect(parseMoney("0,03 EUR")).toBeCloseTo(0.03);
  });

  it("parses integer-only currencies (JPY/KRW)", () => {
    expect(parseMoney("¥120")).toBe(120);
    expect(parseMoney("₩ 1,500")).toBe(1500);
  });

  it("returns null for empty/garbage", () => {
    expect(parseMoney("")).toBeNull();
    expect(parseMoney(null)).toBeNull();
    expect(parseMoney("--")).toBeNull();
  });
});

describe("currency map", () => {
  it("maps ISO to Steam code", () => {
    expect(currencyCode("USD")).toBe(1);
    expect(currencyCode("BRL")).toBe(7);
    expect(currencyCode("eur")).toBe(3);
  });

  it("falls back to USD for unknown codes", () => {
    expect(currencyByIso("XYZ").iso).toBe("USD");
  });

  it("maps ISO to display prefix", () => {
    expect(currencyPrefix("BRL")).toBe("R$ ");
    expect(currencyPrefix("USD")).toBe("$");
  });

  it("formats money with locale-appropriate separators", () => {
    expect(formatMoney(0.04, "USD")).toBe("$0.04");
    expect(formatMoney(0.04, "BRL")).toBe("R$ 0,04");
    expect(formatMoney(120, "JPY")).toBe("¥120");
  });
});
