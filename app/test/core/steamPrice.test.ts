import { describe, it, expect } from "vitest";
import {
  parseMoney,
  currencyCode,
  currencyByIso,
  currencyPrefix,
  formatMoney,
  pickMarketUnit,
  STEAM_CURRENCIES,
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

  it("parses Indonesian rupiah prices", () => {
    expect(parseMoney("Rp 123 039")).toBe(123039);
    expect(parseMoney("Rp 121 314.53")).toBeCloseTo(121314.53);
  });

  it("parses Vietnamese dong prices", () => {
    expect(parseMoney("181.500₫")).toBe(181500);
    expect(parseMoney("178.209,73₫")).toBeCloseTo(178209.73);
  });

  it("parses integer-only currencies (JPY/KRW)", () => {
    expect(parseMoney("¥120")).toBe(120);
    expect(parseMoney("₩ 1,500")).toBe(1500);
  });

  it("parses Malaysian ringgit and Chilean peso prices", () => {
    expect(parseMoney("RM257.74")).toBeCloseTo(257.74);
    expect(parseMoney("CLP$ 55.695,47")).toBeCloseTo(55695.47);
  });

  it("returns null for empty/garbage", () => {
    expect(parseMoney("")).toBeNull();
    expect(parseMoney(null)).toBeNull();
    expect(parseMoney("--")).toBeNull();
  });
});

describe("currency map", () => {
  it("lists all live Steam wallet currencies", () => {
    expect(STEAM_CURRENCIES).toHaveLength(43);
    const codes = STEAM_CURRENCIES.map((c) => c.code);
    const isos = STEAM_CURRENCIES.map((c) => c.iso);
    expect(new Set(codes).size).toBe(codes.length);
    expect(new Set(isos).size).toBe(isos.length);
    for (let i = 1; i < STEAM_CURRENCIES.length; i++) {
      expect(STEAM_CURRENCIES[i].code).toBeGreaterThan(STEAM_CURRENCIES[i - 1].code);
    }
    for (const excluded of ["SEK", "BYN", "HRK", "ARS"]) {
      expect(isos).not.toContain(excluded);
    }
  });

  it("maps ISO to Steam code", () => {
    expect(currencyCode("USD")).toBe(1);
    expect(currencyCode("BRL")).toBe(7);
    expect(currencyCode("eur")).toBe(3);
    expect(currencyCode("PHP")).toBe(12);
    expect(currencyCode("IDR")).toBe(10);
    expect(currencyCode("VND")).toBe(15);
    expect(currencyCode("UAH")).toBe(18);
    expect(currencyCode("MYR")).toBe(11);
    expect(currencyCode("NZD")).toBe(22);
    expect(currencyCode("BGN")).toBe(42);
    expect(currencyCode("RON")).toBe(47);
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
    expect(formatMoney(123039, "IDR")).toBe("Rp 123039.00");
    expect(formatMoney(181500, "VND")).toBe("181500,00");
    expect(formatMoney(3.24, "UAH")).toBe("3,24");
    expect(formatMoney(257.74, "MYR")).toBe("RM257.74");
    expect(formatMoney(107.55, "NZD")).toBe("NZ$ 107.55");
    expect(formatMoney(55695.47, "CLP")).toBe("CLP$ 55695,47");
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
