import { describe, it, expect } from "vitest";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildStageBoxCatalog, isStageBoxItemKey, stageBoxIdSet } from "../../src/core/stageBoxes";

describe("stageBoxes", () => {
  it("maps all 59 wiki stage box ItemKeys", () => {
    const catalog = buildStageBoxCatalog();
    expect(catalog.count).toBe(59);
    expect(catalog.items.find((i) => i.id === 920501)?.name).toBe("Stage Boss Box Lv50");
    expect(catalog.items.find((i) => i.id === 910151)?.level).toBe(15);
  });

  it("writes bundled data/stage_boxes.json", () => {
    const catalog = buildStageBoxCatalog();
    writeFileSync(
      join(__dirname, "../../../data/stage_boxes.json"),
      JSON.stringify({ count: catalog.count, items: catalog.items }),
    );
    const ids = stageBoxIdSet(catalog.items);
    expect(isStageBoxItemKey(920501, ids)).toBe(true);
    expect(isStageBoxItemKey(322111, ids)).toBe(false);
  });
});
