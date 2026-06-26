import { describe, expect, it } from "vitest";
import { lookupItemCardHasBody } from "../../src/renderer/lib/lookupItemCard";
import type { LookupItem } from "../../shared/types";

const thunderstone: LookupItem = {
  id: 144002,
  name: "Thunderstone",
  grade: "IMMORTAL",
  type: "MATERIAL",
  gearType: null,
  gearGroup: null,
  materialType: "CRAFTING",
  level: null,
  iconPath: "item-144002",
  marketTradable: true,
  gearGroups: [],
};

const gearWithStats: LookupItem = {
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
  stats: {
    base: [{ stat: "ATK", mod: "FLAT", value: 10, display: "+10 ATK" }],
    inherent: [],
  },
};

const materialWithEffects: LookupItem = {
  ...thunderstone,
  id: 140001,
  gearGroups: [
    {
      gearGroup: "WEAPON",
      outcomes: [{ tier: 1, displayText: "+5 ATK" }],
    },
  ],
};

describe("lookupItemCardHasBody", () => {
  it("returns false for header-only crafting materials", () => {
    expect(lookupItemCardHasBody(thunderstone)).toBe(false);
  });

  it("returns true for gear with base stats", () => {
    expect(lookupItemCardHasBody(gearWithStats)).toBe(true);
  });

  it("returns true for materials with gear group outcomes", () => {
    expect(lookupItemCardHasBody(materialWithEffects)).toBe(true);
  });
});
