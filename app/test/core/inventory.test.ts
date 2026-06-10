import { describe, it, expect } from "vitest";
import { parseInventory, resolveInventory } from "../../src/core/inventory";
import type { GameItem } from "../../src/core/gamedata";

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
    {"ItemKey":888888,"UniqueId":514119247889201003,"IsChaotic":false},
    {"ItemKey":910151,"UniqueId":514119160999137095,"IsChaotic":false},
    {"ItemKey":0}
  ],
  "aggregateSaveDatas":[{"Type":0,"SubKey":10002,"Value":5}],
  "BoxData":{"BoxTypes":[0,1,2],"BoxUniqueId":[1,2,3],"BoxQuantity":[4,0,3]}
}`;

const catalog: Record<number, GameItem> = {
  322111: {
    id: 322111,
    name: "Void Staff",
    grade: "RARE",
    type: "GEAR",
    level: 50,
    marketTradable: true,
  },
  141002: {
    id: 141002,
    name: "Iron Ingot",
    grade: "UNCOMMON",
    type: "MATERIAL",
    level: null,
    marketTradable: true,
  },
  140002: {
    id: 140002,
    name: "Stone",
    grade: "COMMON",
    type: "MATERIAL",
    level: null,
    marketTradable: true,
  },
  303071: {
    id: 303071,
    name: "Knight Sword",
    grade: "LEGENDARY",
    type: "GEAR",
    level: 30,
    marketTradable: true,
  },
};
const lookup = (key: number): GameItem | undefined => catalog[key];
const isMaterial = (key: number) => lookup(key)?.type === "MATERIAL";

describe("parseInventory", () => {
  it("reads owned items and held chests, skipping junk", () => {
    const snap = parseInventory(wrapPlayer(playerInner), 123, isMaterial);
    expect(snap.items).toHaveLength(6);
    expect(snap.items.filter((i) => i.isChaotic)).toHaveLength(1);
    expect(snap.items.filter((i) => i.inUse)).toHaveLength(1);
    expect(snap.chests).toEqual([
      { type: 0, quantity: 4 },
      { type: 2, quantity: 3 },
    ]);
    expect(snap.saveMtime).toBe(123);
  });

  it("leaves stage-box ItemKeys outside slots as unknown location", () => {
    const snap = parseInventory(wrapPlayer(playerInner), 0);
    const box = snap.items.find((i) => i.itemKey === 910151);
    expect(box?.location).toBe("unknown");
    expect(box?.inUse).toBe(false);
  });

  it("parses material stacks from aggregateSaveDatas when mapped", () => {
    const snap = parseInventory(wrapPlayer(playerInner), 0, isMaterial);
    expect(snap.materialStacks?.get(140002)).toBe(5);
  });

  it("tolerates a missing player gracefully", () => {
    const snap = parseInventory(JSON.stringify({}), 0);
    expect(snap.items).toEqual([]);
    expect(snap.chests).toEqual([]);
  });
});

describe("resolveInventory", () => {
  it("groups by ItemKey, tracks in-use, and values priced rows", () => {
    const snap = parseInventory(wrapPlayer(playerInner), 0, isMaterial);
    const priceLookup = (name: string) =>
      name === "Iron Ingot"
        ? { median: 0.05, lowest: 0.04, rawMedian: "$0.05", rawLowest: "$0.04" }
        : undefined;
    const res = resolveInventory(snap, lookup, true, priceLookup);

    const stone = res.rows.find((r) => r.itemKey === 140002);
    expect(stone?.count).toBe(5);

    const staff = res.rows.find((r) => r.itemKey === 322111)!;
    expect(staff.name).toBe("Void Staff");
    expect(staff.level).toBe(50);
    expect(staff.count).toBe(2);
    expect(staff.inUseCount).toBe(1);
    expect(staff.marketHashName).toBeNull();
    expect(staff.inventoryCount).toBe(0);

    const ingot = res.rows.find((r) => r.itemKey === 141002)!;
    expect(ingot.marketHashName).toBe("Iron Ingot");
    expect(ingot.inventoryCount).toBe(1);
    expect(ingot.priceRaw).toBe("$0.05");
    expect(ingot.priceSource).toBe("median");
    expect(ingot.value).toBeCloseTo(0.05);

    const sword = res.rows.find((r) => r.itemKey === 303071)!;
    expect(sword.marketHashName).toBe("Knight Sword (Legendary) A");
    expect(sword.stashCount).toBe(1);

    expect(res.composition.inUseCount).toBe(1);
    expect(res.composition.priceableCount).toBe(7);
    expect(res.composition.valuedTotal).toBeCloseTo(0.05);
  });

  it("excludes stage boxes from rows and composition when requested", () => {
    const snap = parseInventory(wrapPlayer(playerInner), 0, isMaterial);
    const stageBoxCatalog: Record<number, GameItem> = {
      ...catalog,
      910151: {
        id: 910151,
        name: "Normal Monster Box Lv15",
        grade: "COMMON",
        type: "STAGEBOX",
        level: 15,
        marketTradable: false,
      },
    };
    const withBox = (key: number) => stageBoxCatalog[key];
    const res = resolveInventory(snap, withBox, true, undefined, {
      excludeItemKey: (key) => key === 910151,
    });
    expect(res.rows.find((r) => r.itemKey === 910151)).toBeUndefined();
    expect(res.composition.inUseCount).toBe(1);
    expect(res.composition.total).toBe(10);
  });

  it("picks the gear variant letter that has a Steam price", () => {
    const snap = parseInventory(wrapPlayer(playerInner), 0);
    const priceLookup = (name: string) =>
      name === "Knight Sword (Legendary) B"
        ? { median: 1.5, lowest: 1.4, rawMedian: "$1.50", rawLowest: "$1.40" }
        : undefined;
    const res = resolveInventory(snap, lookup, true, priceLookup);
    const sword = res.rows.find((r) => r.itemKey === 303071)!;
    expect(sword.marketHashName).toBe("Knight Sword (Legendary) B");
    expect(sword.unitPrice).toBe(1.5);
  });
});
