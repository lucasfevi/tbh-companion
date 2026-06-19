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
    {
      itemKey: 3,
      name: "Iron Helm",
      grade: "UNCOMMON",
      type: "GEAR",
      level: 10,
      marketTradable: true,
      marketHashName: "Iron Helm (Uncommon) A",
      count: 4,
      inUseCount: 1,
      inventoryCount: 0,
      stashCount: 3,
      tradingCount: 0,
      chaoticCount: 0,
      known: true,
      priceRaw: "$2.00",
      rawMedian: "$2.00",
      rawLowest: "$1.80",
      unitPrice: 2,
      priceSource: "median",
      priceChecked: true,
      value: 8,
      buyOrderRaw: null,
      buyOrderUnit: null,
      buyOrderQuantity: null,
      buyOrderLevels: null,
      buyOrderValue: null,
      buyOrderCoveredCount: null,
      buyOrderChecked: false,
    },
  ],
  composition: {
    total: 10,
    byGrade: { UNCOMMON: 9, RARE: 1 },
    byType: { MATERIAL: 5, GEAR: 5 },
    tradableCount: 10,
    unknownCount: 0,
    chaoticCount: 0,
    inUseCount: 2,
    priceableCount: 10,
    valuedTotal: 23,
    feeTotal: 1.15,
    netAfterFeesTotal: 21.85,
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
      unequippedOnly: false,
      gradeFilter: "ALL",
      typeFilter: "ALL",
      locationFilter: "equipped",
      sortKey: "name",
      sortDir: "asc",
    });
    expect(rows.map((r) => r.name)).toEqual(["Iron Helm", "Void Staff"]);
  });

  it("sorts by value descending by default pattern", () => {
    const rows = filterAndSortRows(inv, {
      query: "",
      tradableOnly: false,
      unequippedOnly: false,
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
      unequippedOnly: false,
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
      unequippedOnly: false,
      gradeFilter: "ALL",
      typeFilter: "ALL",
      locationFilter: "trading",
      sortKey: "name",
      sortDir: "asc",
    });
    expect(rows).toHaveLength(0);
  });

  it("unequippedOnly hides only fully-equipped rows, keeping rows with mixed equipped/stash copies", () => {
    const rows = filterAndSortRows(inv, {
      query: "",
      tradableOnly: false,
      unequippedOnly: true,
      gradeFilter: "ALL",
      typeFilter: "ALL",
      locationFilter: "ALL",
      sortKey: "name",
      sortDir: "asc",
    });
    // Iron Helm has 1 equipped + 3 in stash, so it must still show; Void Staff (fully
    // equipped, 1/1) is the only row hidden.
    expect(rows.map((r) => r.name)).toEqual(["Iron Helm", "Iron Ingot"]);
  });

  it("sorts by instant sell average", () => {
    const rows = filterAndSortRows(inv, {
      query: "",
      tradableOnly: false,
      unequippedOnly: false,
      gradeFilter: "ALL",
      typeFilter: "ALL",
      locationFilter: "ALL",
      sortKey: "buyOrderAverage",
      sortDir: "desc",
    });
    expect(rows[0].name).toBe("Void Staff");
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
