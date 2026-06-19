import { describe, it, expect, vi } from "vitest";
import { InventoryService } from "../../src/main/services/InventoryService";
import type { InventorySnapshot } from "../../shared/types";

function snap(used: number, capacity: number): InventorySnapshot {
  return { items: [], chests: [], saveMtime: 0, inventoryCapacity: capacity, inventoryUsed: used };
}

describe("InventoryService almost-full threshold", () => {
  it("fires once on the rising edge across the threshold", () => {
    const service = new InventoryService();
    const onAlmostFull = vi.fn();
    service.setOnAlmostFull(onAlmostFull, () => 90);

    service.onInventory(snap(80, 100));
    expect(onAlmostFull).not.toHaveBeenCalled();

    service.onInventory(snap(90, 100));
    expect(onAlmostFull).toHaveBeenCalledTimes(1);
    expect(onAlmostFull).toHaveBeenCalledWith({ used: 90, capacity: 100 });

    service.onInventory(snap(95, 100));
    expect(onAlmostFull).toHaveBeenCalledTimes(1);
  });

  it("re-fires after dropping back below the threshold and crossing again", () => {
    const service = new InventoryService();
    const onAlmostFull = vi.fn();
    service.setOnAlmostFull(onAlmostFull, () => 90);

    service.onInventory(snap(90, 100));
    service.onInventory(snap(80, 100));
    service.onInventory(snap(90, 100));

    expect(onAlmostFull).toHaveBeenCalledTimes(2);
  });

  it("does not fire when no callback is registered", () => {
    const service = new InventoryService();
    expect(() => service.onInventory(snap(100, 100))).not.toThrow();
  });

  it("skips when capacity is zero", () => {
    const service = new InventoryService();
    const onAlmostFull = vi.fn();
    service.setOnAlmostFull(onAlmostFull, () => 90);
    service.onInventory(snap(0, 0));
    expect(onAlmostFull).not.toHaveBeenCalled();
  });
});
