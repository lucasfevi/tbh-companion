import { describe, it, expect } from "vitest";
import { extractItemsFromHtml, indexById } from "../../src/core/gamedata";

// Mimic the escaped-JSON form the data appears in inside the tbh.city RSC page.
const sampleArray = [
  {
    id: 141002,
    name: { en: "Iron Ingot" },
    icon: "sprites/Item_141002.png",
    grade: "UNCOMMON",
    type: "MATERIAL",
    gear_id: "",
    is_market_tradable: true,
  },
  {
    id: 322111,
    name: { en: "Void Staff" },
    icon: "sprites/SWORD_322111.png",
    grade: "RARE",
    type: "GEAR",
    gear_id: "322111",
    is_market_tradable: false,
  },
];
const escaped = JSON.stringify(sampleArray).replace(/"/g, '\\"');
const html = `<script>self.__next_f.push([1,"...prefix ${escaped} suffix..."])</script>`;

describe("gamedata", () => {
  it("extracts and normalizes items from an escaped HTML payload", () => {
    const items = extractItemsFromHtml(html);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      id: 141002,
      name: "Iron Ingot",
      grade: "UNCOMMON",
      type: "MATERIAL",
      icon: "sprites/Item_141002.png",
      gearId: "",
      marketTradable: true,
    });
    expect(items[1].name).toBe("Void Staff");
    expect(items[1].marketTradable).toBe(false);
  });

  it("indexes by id for ItemKey lookup", () => {
    const idx = indexById(extractItemsFromHtml(html));
    expect(idx.get(322111)?.name).toBe("Void Staff");
    expect(idx.get(999999)).toBeUndefined();
  });

  it("throws when no array is present", () => {
    expect(() => extractItemsFromHtml("<html>nothing here</html>")).toThrow();
  });
});
