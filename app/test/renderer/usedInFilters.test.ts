import { describe, expect, it } from "vitest";
import { filterUsedInOutputs, sortUsedInRecipes } from "../../src/renderer/lib/usedInFilters";
import type { LookupItem, LookupUsedInEntry } from "../../shared/types";

const sword: LookupItem = {
  id: 301011,
  name: "Short Sword",
  grade: "COMMON",
  type: "GEAR",
  gearType: "SWORD",
  gearGroup: "WEAPON",
  materialType: null,
  level: 1,
  iconPath: "icons/sword.png",
  marketTradable: true,
};

const axe: LookupItem = {
  id: 311011,
  name: "Hand Axe",
  grade: "COMMON",
  type: "GEAR",
  gearType: "AXE",
  gearGroup: "WEAPON",
  materialType: null,
  level: 1,
  iconPath: "icons/axe.png",
  marketTradable: true,
};

const itemIndex = new Map<number, LookupItem>([
  [sword.id, sword],
  [axe.id, axe],
]);

const outputs = [
  { itemKey: sword.id, poolPct: 11.11 },
  { itemKey: axe.id, poolPct: 9.5 },
];

const usedIn: LookupUsedInEntry[] = [
  {
    recipeKey: 6001002,
    craftingType: "SubWeapon",
    tier: 2,
    level: { min: 11, max: 20 },
    materials: [{ itemKey: 140003, name: "Leather", amount: 2 }],
    outputs: [{ itemKey: sword.id, poolPct: 8 }],
  },
  {
    recipeKey: 6001001,
    craftingType: "MainWeapon",
    tier: 1,
    level: { min: 1, max: 10 },
    materials: [{ itemKey: 140003, name: "Leather", amount: 1 }],
    outputs,
  },
];

describe("sortUsedInRecipes", () => {
  it("sorts tier asc then craftingType asc", () => {
    const sorted = sortUsedInRecipes(usedIn);
    expect(sorted.map((r) => [r.tier, r.craftingType])).toEqual([
      [1, "MainWeapon"],
      [2, "SubWeapon"],
    ]);
  });
});

describe("filterUsedInOutputs", () => {
  it("returns all outputs when query is empty", () => {
    expect(filterUsedInOutputs(outputs, "", itemIndex)).toHaveLength(2);
  });

  it("filters by item name (case-insensitive partial match)", () => {
    const rows = filterUsedInOutputs(outputs, "sword", itemIndex);
    expect(rows).toHaveLength(1);
    expect(rows[0].itemKey).toBe(sword.id);
  });

  it("includes unknown items when query is empty and excludes them when filtering", () => {
    const withUnknown = [{ itemKey: 999999, poolPct: 5 }];
    expect(filterUsedInOutputs(withUnknown, "", itemIndex)).toHaveLength(1);
    expect(filterUsedInOutputs(withUnknown, "anything", itemIndex)).toHaveLength(0);
  });

  it("sorts poolPct desc", () => {
    const rows = filterUsedInOutputs(outputs, "", itemIndex);
    expect(rows.map((r) => r.poolPct)).toEqual([11.11, 9.5]);
  });

  it("returns [] for empty outputs input", () => {
    expect(filterUsedInOutputs([], "", itemIndex)).toEqual([]);
  });
});
