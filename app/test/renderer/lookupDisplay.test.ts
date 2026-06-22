import { describe, expect, it } from "vitest";
import { fmtDropPct, hasDropChance } from "../../src/renderer/lib/lookupDisplay";

describe("fmtDropPct", () => {
  it("formats normal values with two decimal places", () => {
    expect(fmtDropPct(2.5625)).toBe("2.56");
    expect(fmtDropPct(18.61)).toBe("18.61");
  });

  it("rounds a tiny but real chance to two decimals, e.g. 0.02%", () => {
    expect(fmtDropPct(0.0175)).toBe("0.02");
  });

  it("renders sub-0.01% non-zero chances as <0.01 instead of 0.00", () => {
    expect(fmtDropPct(0.0025)).toBe("<0.01");
  });

  it("renders a genuine zero as 0.00", () => {
    expect(fmtDropPct(0)).toBe("0.00");
  });
});

describe("hasDropChance", () => {
  it("is true for any positive dropPct, however small", () => {
    expect(hasDropChance({ dropPct: 0.0025 })).toBe(true);
    expect(hasDropChance({ dropPct: 18.61 })).toBe(true);
  });

  it("is false for a zero or null dropPct", () => {
    expect(hasDropChance({ dropPct: 0 })).toBe(false);
    expect(hasDropChance({ dropPct: null })).toBe(false);
  });
});
