import { describe, it, expect } from "vitest";
import { parseInventory, resolveInventory } from "../src/core/inventory";
import type { GameItem } from "../src/core/gamedata";

function wrap(player: unknown): string {
  return JSON.stringify({ PlayerSaveData: { value: JSON.stringify(player) } });
}

const player = {
  itemSaveDatas: [
    { ItemKey: 322111, UniqueId: 514119247889201000, IsChaotic: false },
    { ItemKey: 322111, UniqueId: 514119247889201001, IsChaotic: true },
    { ItemKey: 141002, UniqueId: 514119247889201002, IsChaotic: false },
    { ItemKey: 999999, UniqueId: 514119247889201003, IsChaotic: false }, // not in catalog
    { ItemKey: 0 }, // junk, skipped
  ],
  BoxData: {
    BoxTypes: [0, 5, 9],
    BoxUniqueId: [1, 2, 3],
    BoxQuantity: [4, 0, 3], // the 0 should be dropped
  },
};

const catalog: Record<number, GameItem> = {
  322111: { id: 322111, name: "Void Staff", grade: "RARE", type: "GEAR", icon: "", gearId: "322111", marketTradable: false },
  141002: { id: 141002, name: "Iron Ingot", grade: "UNCOMMON", type: "MATERIAL", icon: "", gearId: "", marketTradable: true },
};
const lookup = (key: number): GameItem | undefined => catalog[key];

describe("parseInventory", () => {
  it("reads owned items and held chests, skipping junk", () => {
    const snap = parseInventory(wrap(player), 123);
    expect(snap.items).toHaveLength(4); // ItemKey 0 dropped
    expect(snap.items.filter((i) => i.isChaotic)).toHaveLength(1);
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
  it("groups by ItemKey and resolves catalog data + composition", () => {
    const snap = parseInventory(wrap(player), 0);
    const res = resolveInventory(snap, lookup, true);

    const staff = res.rows.find((r) => r.itemKey === 322111)!;
    expect(staff.name).toBe("Void Staff");
    expect(staff.count).toBe(2);
    expect(staff.chaoticCount).toBe(1);
    expect(staff.known).toBe(true);

    const unknown = res.rows.find((r) => r.itemKey === 999999)!;
    expect(unknown.name).toBe("Unknown #999999");
    expect(unknown.known).toBe(false);

    expect(res.composition.total).toBe(4);
    expect(res.composition.tradableCount).toBe(1); // only Iron Ingot
    expect(res.composition.unknownCount).toBe(1);
    expect(res.composition.chaoticCount).toBe(1);
    expect(res.composition.byGrade.RARE).toBe(2);
    expect(res.composition.byType.GEAR).toBe(2);
  });
});
