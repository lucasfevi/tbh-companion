import { describe, it, expect } from "vitest";
import {
  buildGameItems,
  catalogHasGearLevels,
  extractItemsFromHtml,
  extractLevelFromDetailHtml,
  iconTemplateFromPath,
  indexById,
  parseRawItemsFromHtml,
} from "../../src/core/gamedata";

const sampleArray = [
  {
    id: 141002,
    name: { en: "Iron Ingot" },
    icon: "sprites/sharedassets0/Item_141002.png",
    grade: "UNCOMMON",
    type: "MATERIAL",
    is_market_tradable: true,
  },
  {
    id: 322111,
    name: { en: "Void Staff" },
    icon: "sprites/sharedassets0/STAFF_320011.png",
    grade: "RARE",
    type: "GEAR",
    is_market_tradable: false,
  },
];
const escaped = JSON.stringify(sampleArray).replace(/"/g, '\\"');
const html = `<script>self.__next_f.push([1,"...prefix ${escaped} suffix..."])</script>`;

describe("gamedata", () => {
  it("extracts icon template basename from sprite path", () => {
    expect(iconTemplateFromPath("sprites/sharedassets0/STAFF_320011.png")).toBe("STAFF_320011");
  });

  it("extracts level from tbh.city item detail HTML", () => {
    expect(extractLevelFromDetailHtml('..."Level\\":65,\\"IsSteamItem"...')).toBe(65);
  });

  it("extracts and normalizes items from an escaped HTML payload", () => {
    const levels = new Map([["STAFF_320011", 50]]);
    const items = extractItemsFromHtml(html, levels);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      id: 141002,
      name: "Iron Ingot",
      grade: "UNCOMMON",
      type: "MATERIAL",
      level: null,
      marketTradable: true,
    });
    expect(items[1]).toEqual({
      id: 322111,
      name: "Void Staff",
      grade: "RARE",
      type: "GEAR",
      level: 50,
      marketTradable: false,
    });
  });

  it("buildGameItems applies template level map to all matching gear rows", () => {
    const raw = parseRawItemsFromHtml(html);
    const items = buildGameItems(raw, new Map([["STAFF_320011", 50]]));
    expect(items[1].level).toBe(50);
  });

  it("indexes by id for ItemKey lookup", () => {
    const idx = indexById(extractItemsFromHtml(html, new Map([["STAFF_320011", 50]])));
    expect(idx.get(322111)?.name).toBe("Void Staff");
    expect(idx.get(999999)).toBeUndefined();
  });

  it("detects when a catalog snapshot includes gear levels", () => {
    expect(catalogHasGearLevels([{ type: "GEAR", level: 50 } as never])).toBe(true);
    expect(catalogHasGearLevels([{ type: "GEAR", level: null } as never])).toBe(false);
  });

  it("throws when no array is present", () => {
    expect(() => extractItemsFromHtml("<html>nothing here</html>")).toThrow();
  });
});
