import { describe, it, expect } from "vitest";
import {
  classOptionsFromItems,
  defaultLookupSortDir,
  effectOptionsFromItems,
  filterAndSortItems,
  gearTypeOptionsFromItems,
  gradeOptionsFromItems,
  levelOptionsFromItems,
  materialKindOptionsFromItems,
  targetGroupOptionsFromItems,
  typeOptionsFromItems,
  type LookupFilterState,
} from "../../src/renderer/lib/lookupFilters";
import type { LookupItem } from "../../shared/types";

const scepter: LookupItem = {
  id: 1,
  name: "Dimensional Scepter",
  grade: "IMMORTAL",
  type: "GEAR",
  gearType: "SCEPTER",
  gearGroup: "WEAPON",
  materialType: null,
  level: 80,
  iconPath: "SCEPTER_1",
  marketTradable: true,
  stats: {
    base: [{ stat: "AttackDamage", mod: "FLAT", value: 528, display: "Attack Damage 528" }],
    inherent: [
      { stat: "AttackDamage", mod: "ADDITIVE", value: 144, display: "Attack Damage +144" },
    ],
    unique: null,
  },
};

const bow: LookupItem = {
  id: 2,
  name: "Limitless Bow",
  grade: "LEGENDARY",
  type: "GEAR",
  gearType: "BOW",
  gearGroup: "WEAPON",
  materialType: null,
  level: 80,
  iconPath: "BOW_1",
  marketTradable: true,
  stats: {
    base: [{ stat: "AttackDamage", mod: "FLAT", value: 200, display: "Attack Damage 200" }],
    inherent: [],
    unique: { key: 1, mod: "LimitlessProc", text: "Unique: attacks pierce all enemies." },
  },
};

const amulet: LookupItem = {
  id: 3,
  name: "Copper Amulet",
  grade: "UNCOMMON",
  type: "GEAR",
  gearType: "AMULET",
  gearGroup: "ACCESSORY",
  materialType: null,
  level: 1,
  iconPath: "AMULET_1",
  marketTradable: true,
  stats: {
    base: [{ stat: "AttackSpeed", mod: "FLAT", value: 8, display: "8% Increased Attack Speed" }],
    inherent: [],
    unique: null,
  },
};

const engraving: LookupItem = {
  id: 4,
  name: "Griffin Beak",
  grade: "ARCANA",
  type: "MATERIAL",
  gearType: null,
  gearGroup: null,
  materialType: "ENGRAVING",
  level: null,
  iconPath: "ITEM_1",
  marketTradable: true,
  gearGroups: [
    {
      gearGroup: "WEAPON",
      outcomes: [
        {
          stat: "ColdDamagePercent",
          mod: "FLAT",
          tier: 7,
          rawMin: 800,
          rawMax: 1000,
          displayMin: 80,
          displayMax: 100,
          displayText: "Cold Damage +80~100%",
        },
      ],
    },
    {
      gearGroup: "ARMOR",
      outcomes: [
        {
          stat: "LightningResistance",
          mod: "FLAT",
          tier: 6,
          rawMin: 300,
          rawMax: 350,
          displayMin: 30,
          displayMax: 35,
          displayText: "Lightning Resistance +30~35%",
        },
      ],
    },
  ],
};

const crafting: LookupItem = {
  id: 5,
  name: "Iron Ingot",
  grade: "COMMON",
  type: "MATERIAL",
  gearType: null,
  gearGroup: null,
  materialType: "CRAFTING",
  level: null,
  iconPath: "ITEM_2",
  marketTradable: true,
  gearGroups: [],
};

const items = [scepter, bow, amulet, engraving, crafting];

const baseState: LookupFilterState = {
  query: "",
  typeFilter: "ALL",
  gradeFilter: "ALL",
  gearTypeFilter: "ALL",
  classFilter: "ALL",
  materialKindFilter: "ALL",
  effectFilter: "ALL",
  targetGroupFilter: "ALL",
  uniqueOnly: false,
  minLevel: null,
  maxLevel: null,
  sortKey: "name",
  sortDir: "asc",
};

function names(rows: LookupItem[]): string[] {
  return rows.map((r) => r.name);
}

describe("filterAndSortItems", () => {
  it("filters by search query", () => {
    const rows = filterAndSortItems(items, { ...baseState, query: "scepter" });
    expect(names(rows)).toEqual(["Dimensional Scepter"]);
  });

  it("filters by type", () => {
    const rows = filterAndSortItems(items, { ...baseState, typeFilter: "MATERIAL" });
    expect(names(rows)).toEqual(["Griffin Beak", "Iron Ingot"]);
  });

  it("filters by grade", () => {
    const rows = filterAndSortItems(items, { ...baseState, gradeFilter: "LEGENDARY" });
    expect(names(rows)).toEqual(["Limitless Bow"]);
  });

  it("filters by gear slot", () => {
    const rows = filterAndSortItems(items, { ...baseState, gearTypeFilter: "BOW" });
    expect(names(rows)).toEqual(["Limitless Bow"]);
  });

  it("filters by class derived from gearType", () => {
    const rows = filterAndSortItems(items, { ...baseState, classFilter: "Priest" });
    expect(names(rows)).toEqual(["Dimensional Scepter"]);
  });

  it("filters by material kind", () => {
    const rows = filterAndSortItems(items, { ...baseState, materialKindFilter: "CRAFTING" });
    expect(names(rows)).toEqual(["Iron Ingot"]);
  });

  it("filters by the unified effect (stat) filter across gear and materials", () => {
    const gearRows = filterAndSortItems(items, { ...baseState, effectFilter: "AttackDamage" });
    expect(names(gearRows)).toEqual(["Dimensional Scepter", "Limitless Bow"]);

    const matRows = filterAndSortItems(items, {
      ...baseState,
      effectFilter: "ColdDamagePercent",
    });
    expect(names(matRows)).toEqual(["Griffin Beak"]);
  });

  it("filters by target group (what a material applies to)", () => {
    const rows = filterAndSortItems(items, { ...baseState, targetGroupFilter: "ARMOR" });
    expect(names(rows)).toEqual(["Griffin Beak"]);
  });

  it("filters to unique-only gear", () => {
    const rows = filterAndSortItems(items, { ...baseState, uniqueOnly: true });
    expect(names(rows)).toEqual(["Limitless Bow"]);
  });

  it("filters by level range, excluding levelless materials", () => {
    const rows = filterAndSortItems(items, { ...baseState, minLevel: 50, maxLevel: 80 });
    expect(names(rows)).toEqual(["Dimensional Scepter", "Limitless Bow"]);
  });

  it("sorts by name ascending and descending", () => {
    const asc = filterAndSortItems(items, { ...baseState, sortKey: "name", sortDir: "asc" });
    expect(names(asc)).toEqual([
      "Copper Amulet",
      "Dimensional Scepter",
      "Griffin Beak",
      "Iron Ingot",
      "Limitless Bow",
    ]);
    const desc = filterAndSortItems(items, { ...baseState, sortKey: "name", sortDir: "desc" });
    expect(names(desc)).toEqual([...names(asc)].reverse());
  });

  it("sorts by grade rank", () => {
    const rows = filterAndSortItems(items, { ...baseState, sortKey: "grade", sortDir: "desc" });
    expect(rows[0].name).toBe("Griffin Beak"); // ARCANA outranks IMMORTAL/LEGENDARY/UNCOMMON/COMMON
  });

  it("sorts by level, treating materials (null level) as lowest", () => {
    const rows = filterAndSortItems(items, { ...baseState, sortKey: "level", sortDir: "asc" });
    expect(rows[0].level).toBeNull();
    expect(rows[rows.length - 1].name).toMatch(/Dimensional Scepter|Limitless Bow/);
  });

  it("sorts by type (descriptor)", () => {
    const rows = filterAndSortItems(items, { ...baseState, sortKey: "type", sortDir: "asc" });
    expect(rows.length).toBe(items.length);
  });

  it("combines filters", () => {
    const rows = filterAndSortItems(items, {
      ...baseState,
      typeFilter: "GEAR",
      gradeFilter: "LEGENDARY",
      uniqueOnly: true,
    });
    expect(names(rows)).toEqual(["Limitless Bow"]);
  });
});

describe("lookup option helpers", () => {
  it("gradeOptionsFromItems orders by grade rank", () => {
    expect(gradeOptionsFromItems(items)).toEqual([
      "COMMON",
      "UNCOMMON",
      "LEGENDARY",
      "IMMORTAL",
      "ARCANA",
    ]);
  });

  it("typeOptionsFromItems lists distinct types", () => {
    expect(typeOptionsFromItems(items)).toEqual(["GEAR", "MATERIAL"]);
  });

  it("gearTypeOptionsFromItems lists distinct gear slots", () => {
    expect(gearTypeOptionsFromItems(items)).toEqual(["AMULET", "BOW", "SCEPTER"]);
  });

  it("classOptionsFromItems derives classes present in the catalog", () => {
    expect(classOptionsFromItems(items)).toEqual(["Ranger", "Priest"]);
  });

  it("materialKindOptionsFromItems lists distinct material kinds", () => {
    expect(materialKindOptionsFromItems(items)).toEqual(["CRAFTING", "ENGRAVING"]);
  });

  it("targetGroupOptionsFromItems lists gearGroups with outcomes", () => {
    expect(targetGroupOptionsFromItems(items)).toEqual(["ARMOR", "WEAPON"]);
  });

  it("levelOptionsFromItems lists distinct levels ascending", () => {
    expect(levelOptionsFromItems(items)).toEqual([1, 80]);
  });

  it("effectOptionsFromItems unions gear and material stat keys with humanized labels", () => {
    const options = effectOptionsFromItems(items);
    const values = options.map((o) => o.value);
    expect(values).toContain("AttackDamage");
    expect(values).toContain("ColdDamagePercent");
    const attackDamage = options.find((o) => o.value === "AttackDamage");
    expect(attackDamage?.label).toBe("Attack Damage");
  });
});

describe("defaultLookupSortDir", () => {
  it("defaults grade to descending and everything else to ascending", () => {
    expect(defaultLookupSortDir("grade")).toBe("desc");
    expect(defaultLookupSortDir("name")).toBe("asc");
    expect(defaultLookupSortDir("level")).toBe("asc");
    expect(defaultLookupSortDir("type")).toBe("asc");
  });
});
