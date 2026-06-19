import { describe, expect, it } from "vitest";
import { fmtClock, fmtFillEta, fmtHoursUntilFull } from "../../src/renderer/lib/format";

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

describe("fmtHoursUntilFull", () => {
  it("shows minutes under an hour", () => {
    expect(fmtHoursUntilFull(0.5)).toBe("30 min");
  });

  it("shows one decimal of hours under a day", () => {
    expect(fmtHoursUntilFull(3.25)).toBe("3.3 hours");
  });

  it("shows days and hours at or beyond 24 hours", () => {
    expect(fmtHoursUntilFull(50)).toBe("2d 2h");
  });
});

describe("fmtFillEta", () => {
  it("labels same-day projections as today", () => {
    const now = new Date(2026, 5, 19, 10, 0, 0);
    expect(fmtFillEta(2, now)).toMatch(/^today at /);
  });

  it("includes a date for projections on a later day", () => {
    const now = new Date(2026, 5, 19, 10, 0, 0);
    expect(fmtFillEta(30, now)).toMatch(/^Jun 20 at /);
  });
});
