import { describe, expect, it } from "vitest";
import {
  fmtClock,
  fmtFillEta,
  fmtHoursUntilFull,
  fmtShortDuration,
} from "../../src/renderer/lib/format";

describe("fmtShortDuration", () => {
  it("shows only seconds under a minute", () => {
    expect(fmtShortDuration(45)).toBe("45s");
    expect(fmtShortDuration(0)).toBe("0s");
  });

  it("shows minutes and seconds under an hour", () => {
    expect(fmtShortDuration(89)).toBe("1m29s");
    expect(fmtShortDuration(60)).toBe("1m0s");
  });

  it("shows hours and minutes at or beyond an hour (drops seconds)", () => {
    expect(fmtShortDuration(3722)).toBe("1h2m");
  });

  it("clamps negative input to zero", () => {
    expect(fmtShortDuration(-5)).toBe("0s");
  });
});

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
