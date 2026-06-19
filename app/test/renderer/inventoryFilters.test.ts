import { describe, it, expect } from "vitest";
import {
  emptyInventoryFilterMessage,
  filterAndSortRows,
} from "../../src/renderer/lib/inventoryFilters";
import type { ResolvedInventory } from "../../shared/types";

const inv: ResolvedInventory = {
  rows: [
    {
      itemKey: 1,
      name: "Iron Ingot",
      grade: "UNCOMMON",
      type: "MATERIAL",
      level: null,
      marketTradable: true,
      marketHashName: "Iron Ingot (Uncommon)",
      count: 5,
      inUseCount: 0,
      inventoryCount: 5,
      stashCount: 0,
      tradingCount: 0,
      chaoticCount: 0,
      known: true,
      priceRaw: "$1.00",
      rawMedian: "$1.00",
      rawLowest: "$0.90",
      unitPrice: 1,
      priceSource: "median",
      priceChecked: true,
      value: 5,
      buyOrderRaw: null,
      buyOrderUnit: null,
      buyOrderQuantity: null,
      buyOrderLevels: null,
      buyOrderValue: null,
      buyOrderCoveredCount: null,
      buyOrderChecked: false,
    },
    {
      itemKey: 2,
      name: "Void Staff",
      grade: "RARE",
      type: "GEAR",
      level: 50,
      marketTradable: true,
      marketHashName: "Void Staff (Rare) A",
      count: 1,
      inUseCount: 1,
      inventoryCount: 0,
      stashCount: 0,
      tradingCount: 0,
      chaoticCount: 0,
      known: true,
      priceRaw: "$10.00",
      rawMedian: "$10.00",
      rawLowest: "$10.00",
      unitPrice: 10,
      priceSource: "median",
      priceChecked: true,
      value: 10,
      buyOrderRaw: "$8.00",
      buyOrderUnit: 8,
      buyOrderQuantity: 1,
      buyOrderLevels: [{ price: 8, quantity: 1 }],
      buyOrderValue: 8,
      buyOrderCoveredCount: 1,
      buyOrderChecked: true,
    },
  ],
  composition: {
    total: 6,
    byGrade: { UNCOMMON: 5, RARE: 1 },
    byType: { MATERIAL: 5, GEAR: 1 },
    tradableCount: 6,
    unknownCount: 0,
    chaoticCount: 0,
    inUseCount: 1,
    priceableCount: 6,
    valuedTotal: 15,
    feeTotal: 0.75,
    netAfterFeesTotal: 14.25,
    buyOrderValuedTotal: 8,
    buyOrderPricedRows: 1,
    currency: "USD",
  },
  chests: [],
  saveMtime: 0,
  gameDataLoaded: true,
  currency: "USD",
};

describe("inventoryFilters", () => {
  it("filters by tradable and location", () => {
    const rows = filterAndSortRows(inv, {
      query: "",
      tradableOnly: true,
      inUseOnly: false,
      gradeFilter: "ALL",
      typeFilter: "ALL",
      locationFilter: "equipped",
      sortKey: "name",
      sortDir: "asc",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Void Staff");
  });

  it("sorts by value descending by default pattern", () => {
    const rows = filterAndSortRows(inv, {
      query: "",
      tradableOnly: false,
      inUseOnly: false,
      gradeFilter: "ALL",
      typeFilter: "ALL",
      locationFilter: "ALL",
      sortKey: "value",
      sortDir: "desc",
    });
    expect(rows[0].name).toBe("Void Staff");
  });

  it("sorts by buy order value", () => {
    const rows = filterAndSortRows(inv, {
      query: "",
      tradableOnly: false,
      inUseOnly: false,
      gradeFilter: "ALL",
      typeFilter: "ALL",
      locationFilter: "ALL",
      sortKey: "buyOrderValue",
      sortDir: "desc",
    });
    expect(rows[0].name).toBe("Void Staff");
  });

  it("returns no rows for an empty location filter without error", () => {
    const rows = filterAndSortRows(inv, {
      query: "",
      tradableOnly: false,
      inUseOnly: false,
      gradeFilter: "ALL",
      typeFilter: "ALL",
      locationFilter: "trading",
      sortKey: "name",
      sortDir: "asc",
    });
    expect(rows).toHaveLength(0);
  });
});

describe("emptyInventoryFilterMessage", () => {
  it("names the location when filtered", () => {
    expect(emptyInventoryFilterMessage("trading")).toBe("No items in Trading.");
    expect(emptyInventoryFilterMessage("unknown")).toBe("No items in Unknown.");
  });

  it("uses generic copy for all locations", () => {
    expect(emptyInventoryFilterMessage("ALL")).toBe("No items match these filters.");
  });
});
