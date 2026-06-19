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

  it("gives a finite estimate from held chests even when drops are zero (chests full)", () => {
    // 6 common chests, 300s each → drain rate 12/hour. 3 slots left → 0.25h.
    const result = predictFillTime({
      inventoryCapacity: 100,
      inventoryUsed: 97,
      sources: [{ heldChests: 6, autoOpenSecondsPerChest: 300, dropsPerHour: 0 }],
    });
    expect(result.heldChestItems).toBe(6);
    expect(result.steadyItemsPerHour).toBe(0);
    expect(result.hoursUntilFull).toBeCloseTo(0.25, 5);
  });

  it("combines held-chest drain and ongoing drops in parallel", () => {
    // Need 10 slots. Held drains at 12/hr (300s) for 6 chests = 0.5h to drain.
    // Phase 1 (0–0.5h): slope 12 (drain) + 6 (drops) = 18/hr → 9 items by 0.5h.
    // Phase 2 (>0.5h): slope 6/hr (drops only). Remaining 1 item → 1/6 h.
    // Total = 0.5 + 1/6 = 2/3 h.
    const result = predictFillTime({
      inventoryCapacity: 100,
      inventoryUsed: 90,
      sources: [{ heldChests: 6, autoOpenSecondsPerChest: 300, dropsPerHour: 6 }],
    });
    expect(result.hoursUntilFull).toBeCloseTo(2 / 3, 5);
  });

  it("crosses into the steady phase once held chests are drained", () => {
    // 2 held chests at 3600s each → drain rate 1/hr, drains in 2h, adds 2 items.
    // Drops add 1/hr throughout. Need 10 slots.
    // Phase 1 (0–2h): slope 1 (drain) + 1 (drops) = 2/hr → 4 items by 2h.
    // Phase 2 (>2h): slope 1/hr (drops only). Remaining 6 items → 6h. Total 8h.
    const result = predictFillTime({
      inventoryCapacity: 100,
      inventoryUsed: 90,
      sources: [{ heldChests: 2, autoOpenSecondsPerChest: 3600, dropsPerHour: 1 }],
    });
    expect(result.hoursUntilFull).toBeCloseTo(8, 5);
  });

  it("sums multiple enabled chest types", () => {
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
});
