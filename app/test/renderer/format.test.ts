import { describe, expect, it } from "vitest";
import { fmtClock } from "../../src/renderer/lib/format";

describe("fmtClock", () => {
  it("zero-pads single-digit hours for column alignment", () => {
    // 2026-06-16 01:12:15 local — use UTC constructor to avoid TZ flake if we used fixed epoch
    const d = new Date(2026, 5, 16, 1, 12, 15);
    const epoch = d.getTime() / 1000;
    expect(fmtClock(epoch)).toMatch(/^01:12:15 (AM|PM)$/);
  });

  it("keeps two-digit hours unchanged", () => {
    const d = new Date(2026, 5, 16, 11, 5, 9);
    const epoch = d.getTime() / 1000;
    expect(fmtClock(epoch)).toMatch(/^11:05:09 (AM|PM)$/);
  });
});
