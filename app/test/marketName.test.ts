import { describe, it, expect } from "vitest";
import { isPriceableItem, marketHashName, marketHashMatch } from "../src/core/marketName";
import type { GameItem } from "../src/core/gamedata";

const steam = new Set([
  "Iron Ingot",
  "Knight Sword (Legendary) A",
  "Void Staff (Rare) A",
]);

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
    expect(marketHashName(mat, steam)).toBe("Iron Ingot");
  });

  it("maps Legendary gear to (<Grade>) A", () => {
    expect(marketHashName(gearLeg, steam)).toBe("Knight Sword (Legendary) A");
  });

  it("returns null for Rare gear even if steam has a listing", () => {
    expect(marketHashName(gearRare, steam)).toBeNull();
  });

  it("falls back to nearest market grade when catalog grade is missing", () => {
    const steam2 = new Set(["Mystic Boots (Arcana) A", "Mystic Boots (Immortal) A"]);
    const boots: GameItem = {
      id: 533111,
      name: "Mystic Boots",
      grade: "LEGENDARY",
      type: "GEAR",
      icon: "",
      gearId: "533111",
      marketTradable: true,
    };
    const m = marketHashMatch(boots, steam2);
    expect(m?.estimate).toBe(true);
    expect(m?.name).toBe("Mystic Boots (Immortal) A");
  });
});
