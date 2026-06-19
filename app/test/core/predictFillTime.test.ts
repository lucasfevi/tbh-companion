import { describe, it, expect } from "vitest";
import { predictFillTime } from "../../src/core/inventory";

describe("predictFillTime", () => {
  it("returns null hoursUntilFull when there are no sources", () => {
    const result = predictFillTime({
      inventoryCapacity: 100,
      inventoryUsed: 50,
      sources: [],
    });
    expect(result.heldChestItems).toBe(0);
    expect(result.steadyItemsPerHour).toBe(0);
    expect(result.hoursUntilFull).toBeNull();
    expect(result.slotsRemaining).toBe(50);
  });

  it("returns null when inventory capacity is zero", () => {
    const result = predictFillTime({
      inventoryCapacity: 0,
      inventoryUsed: 0,
      sources: [{ heldChests: 5, autoOpenSecondsPerChest: 300, dropsPerHour: 10 }],
    });
    expect(result.hoursUntilFull).toBeNull();
  });

  it("fills purely from ongoing drops when there are no held chests", () => {
    const result = predictFillTime({
      inventoryCapacity: 100,
      inventoryUsed: 50,
      sources: [{ heldChests: 0, autoOpenSecondsPerChest: 300, dropsPerHour: 10 }],
    });
    expect(result.steadyItemsPerHour).toBe(10);
    expect(result.heldChestItems).toBe(0);
    expect(result.hoursUntilFull).toBe(5);
  });

  it("caps steady rate at open rate when drops exceed opener speed", () => {
    const result = predictFillTime({
      inventoryCapacity: 100,
      inventoryUsed: 50,
      sources: [{ heldChests: 0, autoOpenSecondsPerChest: 300, dropsPerHour: 20 }],
    });
    expect(result.steadyItemsPerHour).toBe(12);
    expect(result.hoursUntilFull).toBeCloseTo(50 / 12, 5);
  });

  it("gives a finite estimate from held chests even when drops are zero (chests full)", () => {
    // 6 common chests, 300s each → open rate 12/hour. 3 slots left → 0.25h.
    const result = predictFillTime({
      inventoryCapacity: 100,
      inventoryUsed: 97,
      sources: [{ heldChests: 6, autoOpenSecondsPerChest: 300, dropsPerHour: 0 }],
    });
    expect(result.heldChestItems).toBe(6);
    expect(result.steadyItemsPerHour).toBe(0);
    expect(result.hoursUntilFull).toBeCloseTo(0.25, 5);
  });

  it("combines held backlog drain with drops without double-counting", () => {
    // Need 10 slots. Open rate 12/hr, 6 held, 6 drops/hr → depletes backlog at 1h.
    // By 0.833h: 10 opens complete (not 18/hr phantom rate).
    const result = predictFillTime({
      inventoryCapacity: 100,
      inventoryUsed: 90,
      sources: [{ heldChests: 6, autoOpenSecondsPerChest: 300, dropsPerHour: 6 }],
    });
    expect(result.steadyItemsPerHour).toBe(6);
    expect(result.hoursUntilFull).toBeCloseTo(5 / 6, 5);
  });

  it("crosses into the steady phase once held chests are drained", () => {
    // 2 held chests at 3600s each → open rate 1/hr, depletes at 2h. Drops 1/hr.
    // Phase 1 (0–2h): open rate 1/hr → 2 items by 2h. Phase 2: drops only 1/hr.
    // Need 10 slots → 2h + 8h = 10h.
    const result = predictFillTime({
      inventoryCapacity: 100,
      inventoryUsed: 90,
      sources: [{ heldChests: 2, autoOpenSecondsPerChest: 3600, dropsPerHour: 1 }],
    });
    expect(result.hoursUntilFull).toBeCloseTo(10, 5);
  });

  it("sums multiple enabled chest types with independent drain phases", () => {
    // Need 10 slots. A: 6 held @ 12/hr (depletes 0.5h). B: 4 held @ 6/hr (depletes 0.667h).
    // [0,0.5): slope 18 → 9 items. [0.5,0.667): slope 6 → 1 item. Total 0.667h.
    const result = predictFillTime({
      inventoryCapacity: 100,
      inventoryUsed: 90,
      sources: [
        { heldChests: 6, autoOpenSecondsPerChest: 300, dropsPerHour: 0 },
        { heldChests: 4, autoOpenSecondsPerChest: 600, dropsPerHour: 0 },
      ],
    });
    expect(result.hoursUntilFull).toBeCloseTo(2 / 3, 5);
  });

  it("sums steady drop rates across types once backlogs are empty", () => {
    const result = predictFillTime({
      inventoryCapacity: 100,
      inventoryUsed: 90,
      sources: [
        { heldChests: 0, autoOpenSecondsPerChest: 300, dropsPerHour: 6 },
        { heldChests: 0, autoOpenSecondsPerChest: 600, dropsPerHour: 4 },
      ],
    });
    expect(result.steadyItemsPerHour).toBe(10);
    expect(result.hoursUntilFull).toBe(1);
  });

  it("returns zero hours and zero slots remaining when already full", () => {
    const result = predictFillTime({
      inventoryCapacity: 100,
      inventoryUsed: 100,
      sources: [{ heldChests: 5, autoOpenSecondsPerChest: 300, dropsPerHour: 10 }],
    });
    expect(result.slotsRemaining).toBe(0);
    expect(result.hoursUntilFull).toBe(0);
  });

  it("clamps slotsRemaining at 0 when used exceeds capacity", () => {
    const result = predictFillTime({
      inventoryCapacity: 100,
      inventoryUsed: 120,
      sources: [{ heldChests: 5, autoOpenSecondsPerChest: 300, dropsPerHour: 10 }],
    });
    expect(result.slotsRemaining).toBe(0);
    expect(result.hoursUntilFull).toBe(0);
  });

  it("returns null when held backlog and drops cannot fill remaining slots", () => {
    const result = predictFillTime({
      inventoryCapacity: 100,
      inventoryUsed: 90,
      sources: [{ heldChests: 3, autoOpenSecondsPerChest: 300, dropsPerHour: 0 }],
    });
    expect(result.hoursUntilFull).toBeNull();
  });
});
