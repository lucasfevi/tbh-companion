import { describe, it, expect } from "vitest";
import { filterAndSortRows } from "../../src/renderer/lib/inventoryFilters";
import type { ResolvedInventory } from "../../shared/types";

const inv: ResolvedInventory = {
  rows: [
    {
      itemKey: 1,
      name: "Iron Ingot",
      grade: "UNCOMMON",
      type: "MATERIAL",
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
      unitPrice: 1,
      priceSource: "median",
      value: 5,
    },
    {
      itemKey: 2,
      name: "Void Staff",
      grade: "RARE",
      type: "GEAR",
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
      unitPrice: 10,
      priceSource: "median",
      value: 10,
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
});
