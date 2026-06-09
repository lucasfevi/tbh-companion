import { describe, it, expect } from "vitest";
import { isPriceableItem, marketHashName, marketHashMatch, marketHashCandidates } from "../../src/core/marketName";
import type { GameItem } from "../../src/core/gamedata";

const mat: GameItem = {
  id: 141002,
  name: "Iron Ingot",
  grade: "UNCOMMON",
  type: "MATERIAL",
  icon: "",
  gearId: "",
  marketTradable: true,
};

const gearLeg: GameItem = {
  id: 303071,
  name: "Knight Sword",
  grade: "LEGENDARY",
  type: "GEAR",
  icon: "",
  gearId: "303071",
  marketTradable: true,
};

const gearRare: GameItem = {
  id: 322111,
  name: "Void Staff",
  grade: "RARE",
  type: "GEAR",
  icon: "",
  gearId: "322111",
  marketTradable: true,
};

describe("isPriceableItem", () => {
  it("prices all tradable materials regardless of grade", () => {
    expect(isPriceableItem("MATERIAL", "COMMON", true)).toBe(true);
    expect(isPriceableItem("MATERIAL", "RARE", true)).toBe(true);
  });

  it("only prices Legendary+ gear", () => {
    expect(isPriceableItem("GEAR", "RARE", true)).toBe(false);
    expect(isPriceableItem("GEAR", "LEGENDARY", true)).toBe(true);
    expect(isPriceableItem("GEAR", "IMMORTAL", true)).toBe(true);
  });

  it("skips non-tradable items", () => {
    expect(isPriceableItem("GEAR", "LEGENDARY", false)).toBe(false);
  });
});

describe("marketHashName", () => {
  it("maps materials by display name", () => {
    expect(marketHashName(mat)).toBe("Iron Ingot");
  });

  it("maps Legendary gear to (<Grade>) A", () => {
    expect(marketHashName(gearLeg)).toBe("Knight Sword (Legendary) A");
  });

  it("returns null for Rare gear", () => {
    expect(marketHashName(gearRare)).toBeNull();
  });

  it("builds hash from name and grade", () => {
    const dusk: GameItem = {
      id: 314071,
      name: "Dusk Bow",
      grade: "IMMORTAL",
      type: "GEAR",
      icon: "",
      gearId: "314071",
      marketTradable: true,
    };
    expect(marketHashName(dusk)).toBe("Dusk Bow (Immortal) A");
  });

  it("uses exact grade (no cross-grade fallback)", () => {
    const boots: GameItem = {
      id: 533111,
      name: "Mystic Boots",
      grade: "LEGENDARY",
      type: "GEAR",
      icon: "",
      gearId: "533111",
      marketTradable: true,
    };
    expect(marketHashMatch(boots)?.name).toBe("Mystic Boots (Legendary) A");
  });

  it("lists gear variant letters A–E for Steam probing", () => {
    expect(marketHashCandidates(gearLeg)).toEqual([
      "Knight Sword (Legendary) A",
      "Knight Sword (Legendary) B",
      "Knight Sword (Legendary) C",
      "Knight Sword (Legendary) D",
      "Knight Sword (Legendary) E",
    ]);
    expect(marketHashCandidates(mat)).toEqual(["Iron Ingot"]);
  });
});
