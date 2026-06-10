import { describe, it, expect } from "vitest";
import {
  parseMoney,
  currencyCode,
  currencyByIso,
  currencyPrefix,
  formatMoney,
  pickMarketUnit,
} from "../../src/core/steamPrice";

describe("parseMoney", () => {
  it("parses US-format prices", () => {
    expect(parseMoney("$0.04")).toBeCloseTo(0.04);
    expect(parseMoney("$1,234.56")).toBeCloseTo(1234.56);
  });

  it("parses comma-decimal prices (BRL/EUR)", () => {
    expect(parseMoney("R$ 0,17")).toBeCloseTo(0.17);
    expect(parseMoney("1.234,56 zl")).toBeCloseTo(1234.56);
    expect(parseMoney("0,03 EUR")).toBeCloseTo(0.03);
    expect(parseMoney("3,24₴")).toBeCloseTo(3.24);
  });

  it("parses Philippine peso prices", () => {
    expect(parseMoney("P6.49")).toBeCloseTo(6.49);
    expect(parseMoney("P4.44")).toBeCloseTo(4.44);
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
    expect(currencyCode("PHP")).toBe(12);
    expect(currencyCode("UAH")).toBe(18);
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
    expect(formatMoney(6.49, "PHP")).toBe("P6.49");
    expect(formatMoney(3.24, "UAH")).toBe("3,24");
  });
});

describe("pickMarketUnit", () => {
  it("prefers median over lowest", () => {
    const picked = pickMarketUnit({
      median: 0.05,
      lowest: 0.04,
      rawMedian: "$0.05",
      rawLowest: "$0.04",
    });
    expect(picked.unit).toBeCloseTo(0.05);
    expect(picked.source).toBe("median");
    expect(picked.raw).toBe("$0.05");
  });

  it("falls back to lowest when median is missing", () => {
    const picked = pickMarketUnit({
      median: null,
      lowest: 0.04,
      rawMedian: null,
      rawLowest: "$0.04",
    });
    expect(picked.unit).toBeCloseTo(0.04);
    expect(picked.source).toBe("lowest");
  });
});
