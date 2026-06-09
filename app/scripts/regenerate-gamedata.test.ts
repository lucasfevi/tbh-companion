import { describe, it, expect } from "vitest";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  extractAndEnrichItemsFromHtml,
  parseRawItemsFromHtml,
} from "../src/core/gamedata";

const SOURCE_URL = "https://tbh.city/items";
const outPath = join(__dirname, "../../data/gamedata.json");

describe("regenerate bundled gamedata", () => {
  it(
    "scrapes tbh.city and writes cleaned catalog with gear levels",
    async () => {
      const res = await fetch(SOURCE_URL, {
        headers: { "User-Agent": "Mozilla/5.0 (TBH Companion regenerate)" },
      });
      expect(res.ok).toBe(true);
      const html = await res.text();
      const raw = parseRawItemsFromHtml(html);
      expect(raw.length).toBeGreaterThan(5000);

      const { items, levelsByTemplate } = await extractAndEnrichItemsFromHtml(html);
      expect(items.length).toBe(raw.length);
      expect(levelsByTemplate.size).toBeGreaterThan(300);

      const voidStaff = items.find((i) => i.id === 322111);
      expect(voidStaff?.level).toBe(50);
      const vengeance = items.find((i) => i.id === 301141);
      expect(vengeance?.level).toBe(65);
      const ingot = items.find((i) => i.id === 141002);
      expect(ingot?.level).toBeNull();

      const payload = {
        source: SOURCE_URL,
        fetchedUtc: new Date().toISOString(),
        count: items.length,
        items,
      };
      writeFileSync(outPath, JSON.stringify(payload));
    },
    300_000,
  );
});
