import { describe, it, expect } from "vitest";
import { compareBoxTimerRows, normalizeBoxTrackerSortOrder } from "../../src/core/boxTrackerSort";
import type { BoxTimerRow } from "../../shared/types";

function row(overrides: Partial<BoxTimerRow> & Pick<BoxTimerRow, "boxId" | "status">): BoxTimerRow {
  return {
    name: "Box",
    level: 1,
    idealStageKey: 1,
    idealStageLabel: "Stage 1",
    cooldownSeconds: 720,
    cooldownIsCustom: false,
    active: overrides.status === "cooldown",
    remainingSeconds: overrides.status === "cooldown" ? 300 : 0,
    progress: 0,
    atIdealStage: false,
    ...overrides,
  };
}

describe("compareBoxTimerRows", () => {
  it("sorts cooldown before ready when cooldown-first", () => {
    const cooldown = row({ boxId: 1, status: "cooldown", level: 50 });
    const ready = row({ boxId: 2, status: "ready", level: 1 });
    expect(compareBoxTimerRows(cooldown, ready, "cooldown-first")).toBeLessThan(0);
    expect(compareBoxTimerRows(ready, cooldown, "cooldown-first")).toBeGreaterThan(0);
  });

  it("sorts ready before cooldown when ready-first", () => {
    const cooldown = row({ boxId: 1, status: "cooldown", level: 50 });
    const ready = row({ boxId: 2, status: "ready", level: 1 });
    expect(compareBoxTimerRows(ready, cooldown, "ready-first")).toBeLessThan(0);
    expect(compareBoxTimerRows(cooldown, ready, "ready-first")).toBeGreaterThan(0);
  });

  it("sorts cooldown rows by remaining seconds ascending", () => {
    const soon = row({ boxId: 1, status: "cooldown", remainingSeconds: 60, level: 20 });
    const later = row({ boxId: 2, status: "cooldown", remainingSeconds: 600, level: 10 });
    expect(compareBoxTimerRows(soon, later, "cooldown-first")).toBeLessThan(0);
    expect(compareBoxTimerRows(soon, later, "ready-first")).toBeLessThan(0);
  });

  it("sorts ready rows by level then boxId", () => {
    const low = row({ boxId: 920201, status: "ready", level: 20 });
    const high = row({ boxId: 920151, status: "ready", level: 15 });
    expect(compareBoxTimerRows(high, low, "ready-first")).toBeLessThan(0);
  });
});

describe("normalizeBoxTrackerSortOrder", () => {
  it("accepts ready-first", () => {
    expect(normalizeBoxTrackerSortOrder("ready-first")).toBe("ready-first");
  });

  it("defaults invalid values to cooldown-first", () => {
    expect(normalizeBoxTrackerSortOrder(undefined)).toBe("cooldown-first");
    expect(normalizeBoxTrackerSortOrder("invalid")).toBe("cooldown-first");
  });
});
