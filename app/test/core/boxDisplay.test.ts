import { describe, expect, it } from "vitest";
import {
  boxCategoryLabel,
  boxDropViaLabel,
  boxStageListLabel,
  dropStageRangeLabel,
  FIRST_DROP_ONLY_LABEL,
  summarizeSpawnPcts,
} from "../../src/core/lookup/boxDisplay";
import { loadLookupSources } from "../../src/core/lookup/catalog";

describe("boxDisplay", () => {
  it("labels box categories and drop vias", () => {
    expect(boxStageListLabel(1103, "Wasteland")).toBe("Normal 1-3 - Wasteland");
    expect(boxCategoryLabel("common")).toBe("Common chest");
    expect(boxCategoryLabel("stage_boss")).toBe("Stage boss chest");
    expect(boxCategoryLabel("act_boss")).toBe("Act boss chest");
    expect(boxDropViaLabel("monster_box")).toBe("Monster kill");
    expect(boxDropViaLabel("boss_box")).toBe("Stage boss kill");
    expect(boxDropViaLabel("act_boss")).toBe("Act boss kill");
    expect(FIRST_DROP_ONLY_LABEL).toBe("First clear only");
  });

  it("summarizes uniform and varying spawn percentages", () => {
    expect(
      summarizeSpawnPcts([
        { stageKey: 1101, stageName: "A", via: "boss_box", spawnPct: 100 },
        { stageKey: 1102, stageName: "B", via: "boss_box", spawnPct: 100 },
      ]),
    ).toEqual({ min: 100, max: 100 });

    expect(
      summarizeSpawnPcts([
        { stageKey: 1104, stageName: "A", via: "boss_box", spawnPct: 100 },
        { stageKey: 1105, stageName: "B", via: "boss_box", spawnPct: 80 },
      ]),
    ).toEqual({ min: 80, max: 100 });
  });

  it("compresses consecutive stage keys into range labels", () => {
    expect(dropStageRangeLabel([1101, 1102, 1103])).toBe("Normal 1-1 – 1-3");
    expect(dropStageRangeLabel([1104, 1105, 1106, 1107])).toBe("Normal 1-4 – 1-7");
  });
});

describe("lookup box sources", () => {
  it("loads farm spawnPct, act boss stages, and first-drop flags", () => {
    const sources = loadLookupSources();
    const farm = sources.boxes["920101"];
    expect(farm.stages[0]?.spawnPct).toBe(40);
    expect(farm.firstDropOnly).toBe(false);

    const act = sources.boxes["930901"];
    expect(act.stages).toHaveLength(2);
    expect(act.stages.every((s) => s.via === "act_boss" && s.spawnPct === 100)).toBe(true);

    const first = sources.boxes["920001"];
    expect(first.firstDropOnly).toBe(true);
    expect(first.firstDropStages).toEqual([{ stageKey: 1101, stageName: "Pasture" }]);
    expect(first.stages).toHaveLength(0);
  });
});
