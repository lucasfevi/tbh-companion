import { describe, it, expect } from "vitest";
import {
  defaultOfferingLootSortDir,
  filterAndSortLoot,
  gradeOptionsFromLoot,
  resolveOfferingLoot,
  type OfferingLootFilterState,
  type ResolvedOfferingLoot,
} from "../../src/renderer/lib/offeringLootFilters";
import { itemDescriptor } from "../../src/renderer/lib/lookupDisplay";
import type { LookupItem, OfferingLootEntry } from "../../shared/types";

function gear(
  id: number,
  name: string,
  grade: string,
  gearType: string,
  level: number,
): LookupItem {
  return {
    id,
    name,
    grade,
    type: "GEAR",
    gearType,
    gearGroup: "WEAPON",
    materialType: null,
    level,
    iconPath: `ICON_${id}`,
    marketTradable: true,
    stats: { base: [], inherent: [], unique: null },
  };
}

const bow = gear(1, "Limitless Bow", "LEGENDARY", "BOW", 80);
const scepter = gear(2, "Dimensional Scepter", "IMMORTAL", "SCEPTER", 80);
const amulet = gear(3, "Copper Amulet", "UNCOMMON", "AMULET", 10);

const catalog = new Map<number, LookupItem>([
  [1, bow],
  [2, scepter],
  [3, amulet],
]);

const loot: OfferingLootEntry[] = [
  { itemKey: 1, poolPct: 50 },
  { itemKey: 2, poolPct: 30 },
  { itemKey: 3, poolPct: 20 },
];

const resolved = resolveOfferingLoot(loot, (key) => catalog.get(key));

const baseState: OfferingLootFilterState = {
  query: "",
  gradeFilter: [],
  typeFilter: [],
  sortKey: "dropPct",
  sortDir: "desc",
};

function names(rows: ResolvedOfferingLoot[]): string[] {
  return rows.map((r) => r.item?.name ?? `#${r.itemKey}`);
}

describe("filterAndSortLoot", () => {
  it("treats empty filters as no filter and sorts by drop % descending", () => {
    const rows = filterAndSortLoot(resolved, baseState);
    expect(names(rows)).toEqual(["Limitless Bow", "Dimensional Scepter", "Copper Amulet"]);
  });

  it("filters by a single grade", () => {
    const rows = filterAndSortLoot(resolved, { ...baseState, gradeFilter: ["LEGENDARY"] });
    expect(names(rows)).toEqual(["Limitless Bow"]);
  });

  it("includes any item matching one of several selected grades (OR within a filter)", () => {
    const rows = filterAndSortLoot(resolved, {
      ...baseState,
      gradeFilter: ["LEGENDARY", "IMMORTAL"],
    });
    expect(names(rows)).toEqual(["Limitless Bow", "Dimensional Scepter"]);
  });

  it("filters by type descriptor (OR within a filter)", () => {
    const selected = [itemDescriptor(bow), itemDescriptor(amulet)];
    const rows = filterAndSortLoot(resolved, { ...baseState, typeFilter: selected });
    const got = new Set(names(rows));
    expect(got.has("Limitless Bow")).toBe(true);
    expect(got.has("Copper Amulet")).toBe(true);
  });

  it("ANDs distinct filters together", () => {
    const rows = filterAndSortLoot(resolved, {
      ...baseState,
      gradeFilter: ["UNCOMMON"],
      typeFilter: [itemDescriptor(bow)],
    });
    expect(rows).toHaveLength(0);
  });

  it("filters by search query on item name", () => {
    const rows = filterAndSortLoot(resolved, { ...baseState, query: "scepter" });
    expect(names(rows)).toEqual(["Dimensional Scepter"]);
  });

  it("sorts by grade rank descending", () => {
    const rows = filterAndSortLoot(resolved, { ...baseState, sortKey: "grade", sortDir: "desc" });
    expect(names(rows)[0]).toBe("Dimensional Scepter"); // IMMORTAL outranks LEGENDARY/UNCOMMON
  });
});

describe("offering loot option helpers", () => {
  it("gradeOptionsFromLoot lists present grades by rank", () => {
    expect(gradeOptionsFromLoot(resolved)).toEqual(["UNCOMMON", "LEGENDARY", "IMMORTAL"]);
  });

  it("defaultOfferingLootSortDir defaults name to asc and others to desc", () => {
    expect(defaultOfferingLootSortDir("name")).toBe("asc");
    expect(defaultOfferingLootSortDir("dropPct")).toBe("desc");
    expect(defaultOfferingLootSortDir("grade")).toBe("desc");
  });
});
