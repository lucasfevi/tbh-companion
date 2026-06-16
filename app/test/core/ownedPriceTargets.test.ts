import { describe, it, expect } from "vitest";
import {
  ownedPriceTargets,
  ownedPriceTargetForItem,
  flattenOwnedHashes,
} from "../../src/core/inventory/ownedPriceTargets";
import type { GameItem } from "../../src/core/gamedata";
import type { InventorySnapshot } from "../../shared/types";

const gearLeg: GameItem = {
  id: 303071,
  name: "Knight Sword",
  type: "GEAR",
  grade: "LEGENDARY",
  marketTradable: true,
  level: 30,
};

const mat: GameItem = {
  id: 141002,
  name: "Wood",
  type: "MATERIAL",
  grade: "COMMON",
  marketTradable: true,
  level: null,
};

function snap(items: InventorySnapshot["items"]): InventorySnapshot {
  return { items, chests: [], saveMtime: 0 };
}

describe("ownedPriceTargets", () => {
  it("returns one gear target with variant A candidate per owned piece", () => {
    const lookup = (key: number) => (key === 303071 ? gearLeg : undefined);
    const targets = ownedPriceTargets(
      snap([{ itemKey: 303071, isChaotic: false, inUse: false, location: "inventory" }]),
      lookup,
    );
    expect(targets).toHaveLength(1);
    expect(targets[0]).toEqual({
      kind: "gear",
      candidates: ["Knight Sword (Legendary) A"],
    });
  });

  it("returns one material target per owned material", () => {
    const lookup = (key: number) => (key === 141002 ? mat : undefined);
    const targets = ownedPriceTargets(
      snap([{ itemKey: 141002, isChaotic: false, inUse: false, location: "inventory" }]),
      lookup,
    );
    expect(targets).toEqual([{ kind: "material", hash: "Wood" }]);
  });

  it("flattens all variant hashes for cache prune", () => {
    const target = ownedPriceTargetForItem(gearLeg);
    expect(target?.kind).toBe("gear");
    if (target?.kind !== "gear") return;
    const flat = flattenOwnedHashes([target]);
    expect(flat).toHaveLength(1);
    expect(flat[0]).toContain(" A");
  });
});
