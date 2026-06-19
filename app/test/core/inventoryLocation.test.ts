import { describe, it, expect } from "vitest";
import {
  unassignedCount,
  rowMatchesLocation,
  rowMatchesAnyLocation,
} from "../../src/core/inventory/location";
import type { ResolvedInventoryRow } from "../../shared/types";

const row: ResolvedInventoryRow = {
  itemKey: 1,
  name: "Test",
  grade: "LEGENDARY",
  type: "GEAR",
  level: 30,
  marketTradable: true,
  marketHashName: null,
  count: 3,
  inUseCount: 1,
  chaoticCount: 0,
  known: true,
  priceRaw: null,
  rawMedian: null,
  rawLowest: null,
  unitPrice: null,
  priceSource: null,
  priceChecked: false,
  value: null,
  buyOrderRaw: null,
  buyOrderUnit: null,
  buyOrderQuantity: null,
  buyOrderLevels: null,
  buyOrderValue: null,
  buyOrderCoveredCount: null,
  buyOrderChecked: false,
  inventoryCount: 1,
  stashCount: 0,
  tradingCount: 0,
};

describe("inventory location helpers", () => {
  it("computes unassigned count", () => {
    expect(unassignedCount(row)).toBe(1);
  });

  it("matches unknown when unassigned > 0", () => {
    expect(rowMatchesLocation(row, "unknown")).toBe(true);
    expect(rowMatchesAnyLocation([row], "unknown")).toBe(true);
  });

  it("does not match unknown when fully assigned", () => {
    const full = { ...row, count: 1, inUseCount: 0, inventoryCount: 1 };
    expect(rowMatchesLocation(full, "unknown")).toBe(false);
    expect(rowMatchesAnyLocation([full], "unknown")).toBe(false);
  });
});
