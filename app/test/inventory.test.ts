import { describe, it, expect } from "vitest";
import { parseInventory, resolveInventory } from "../src/core/inventory";
import type { GameItem } from "../src/core/gamedata";

function wrapPlayer(inner: string): string {
  return JSON.stringify({ PlayerSaveData: { value: inner } });
}

// Inner JSON must be a literal string so UniqueId digits are not rounded by
// JSON.stringify (they exceed Number.MAX_SAFE_INTEGER).
const playerInner = `{
  "heroSaveDatas":[{"heroKey":201,"equippedItemIds":[514119247889201000]}],
  "inventorySaveDatas":[{"Index":0,"ItemUniqueId":514119247889201002,"IsUnlock":true}],
  "stashSaveDatas":[{"Index":0,"ItemUniqueId":514119247889201004,"IsUnlock":true}],
  "itemSaveDatas":[
    {"ItemKey":322111,"UniqueId":514119247889201000,"IsChaotic":false},
    {"ItemKey":322111,"UniqueId":514119247889201001,"IsChaotic":true},
    {"ItemKey":141002,"UniqueId":514119247889201002,"IsChaotic":false},
    {"ItemKey":303071,"UniqueId":514119247889201004,"IsChaotic":false},
    {"ItemKey":999999,"UniqueId":514119247889201003,"IsChaotic":false},
    {"ItemKey":0}
  ],
  "BoxData":{"BoxTypes":[0,5,9],"BoxUniqueId":[1,2,3],"BoxQuantity":[4,0,3]}
}`;

const catalog: Record<number, GameItem> = {
  322111: {
    id: 322111,
    name: "Void Staff",
    grade: "RARE",
    type: "GEAR",
    icon: "",
    gearId: "322111",
    marketTradable: true,
  },
  141002: {
    id: 141002,
    name: "Iron Ingot",
    grade: "UNCOMMON",
    type: "MATERIAL",
    icon: "",
    gearId: "",
    marketTradable: true,
  },
  303071: {
    id: 303071,
    name: "Knight Sword",
    grade: "LEGENDARY",
    type: "GEAR",
    icon: "",
    gearId: "303071",
    marketTradable: true,
  },
};
const lookup = (key: number): GameItem | undefined => catalog[key];
const steam = new Set(["Iron Ingot", "Knight Sword (Legendary) A"]);

describe("parseInventory", () => {
  it("reads owned items and held chests, skipping junk", () => {
    const snap = parseInventory(wrapPlayer(playerInner), 123);
    expect(snap.items).toHaveLength(5);
    expect(snap.items.filter((i) => i.isChaotic)).toHaveLength(1);
    expect(snap.items.filter((i) => i.inUse)).toHaveLength(1);
    expect(snap.chests).toEqual([
      { type: 0, quantity: 4 },
      { type: 9, quantity: 3 },
    ]);
    expect(snap.saveMtime).toBe(123);
  });

  it("tolerates a missing player gracefully", () => {
    const snap = parseInventory(JSON.stringify({}), 0);
    expect(snap.items).toEqual([]);
    expect(snap.chests).toEqual([]);
  });
});

describe("resolveInventory", () => {
  it("groups by ItemKey, tracks in-use, and values priced rows", () => {
    const snap = parseInventory(wrapPlayer(playerInner), 0);
    const priceLookup = (name: string) =>
      name === "Iron Ingot" ? { lowest: 0.04, raw: "$0.04" } : undefined;
    const res = resolveInventory(snap, lookup, true, priceLookup, steam);

    const staff = res.rows.find((r) => r.itemKey === 322111)!;
    expect(staff.name).toBe("Void Staff");
    expect(staff.count).toBe(2);
    expect(staff.inUseCount).toBe(1);
    expect(staff.marketHashName).toBeNull();
    expect(staff.inventoryCount).toBe(0);

    const ingot = res.rows.find((r) => r.itemKey === 141002)!;
    expect(ingot.marketHashName).toBe("Iron Ingot");
    expect(ingot.inventoryCount).toBe(1);
    expect(ingot.priceRaw).toBe("$0.04");
    expect(ingot.value).toBeCloseTo(0.04);

    const sword = res.rows.find((r) => r.itemKey === 303071)!;
    expect(sword.marketHashName).toBe("Knight Sword (Legendary) A");
    expect(sword.stashCount).toBe(1);

    expect(res.composition.inUseCount).toBe(1);
    expect(res.composition.priceableCount).toBe(2);
    expect(res.composition.valuedTotal).toBeCloseTo(0.04);
  });
});
