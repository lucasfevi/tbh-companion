import { describe, it, expect } from "vitest";
import {
  catalogItemKeyFromSave,
  indexById,
  normalizeGameItem,
  type GameItem,
} from "../../src/core/gamedata";

describe("gamedata", () => {
  it("normalizes catalog rows from JSON", () => {
    expect(
      normalizeGameItem({
        id: 322111,
        name: "Void Staff",
        grade: "RARE",
        type: "GEAR",
        level: 50,
        marketTradable: false,
      }),
    ).toEqual({
      id: 322111,
      name: "Void Staff",
      grade: "RARE",
      type: "GEAR",
      level: 50,
      marketTradable: false,
    });
  });

  it("indexes by id for ItemKey lookup", () => {
    const items: GameItem[] = [
      {
        id: 322111,
        name: "Void Staff",
        grade: "RARE",
        type: "GEAR",
        level: 50,
        marketTradable: false,
      },
    ];
    const idx = indexById(items);
    expect(idx.get(322111)?.name).toBe("Void Staff");
    expect(idx.get(999999)).toBeUndefined();
  });

  it("maps suffixed save ItemKeys to catalog ids", () => {
    expect(catalogItemKeyFromSave(322111)).toBe(322111);
    expect(catalogItemKeyFromSave(514051900)).toBe(514051);
    expect(catalogItemKeyFromSave(140001900)).toBe(140001);
    expect(catalogItemKeyFromSave(910151900)).toBe(910151);
    expect(catalogItemKeyFromSave(1_500_000_000)).toBe(1_500_000_000);
  });

  it("returns null for invalid catalog rows", () => {
    expect(normalizeGameItem({ name: "no id" })).toBeNull();
  });
});
