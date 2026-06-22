import { describe, expect, it } from "vitest";
import { loadSynthesisModel } from "../../src/core/lookup/catalog";
import {
  gradeRoll,
  pathsToItem,
  simulate,
  formatSynthesisPathSetup,
  formatSynthesisResultRange,
  formatMaterialAverageLevelRange,
  materialAverageLevelRange,
  recipeTierResultRange,
} from "../../src/core/lookup/synthesis";

const AMBER_RING = {
  id: 623071,
  name: "Amber Ring",
  grade: "LEGENDARY",
  type: "GEAR" as const,
  gearType: "RING",
  gearGroup: "ACCESSORY",
  materialType: null,
  level: 30,
  iconPath: "RING_620007",
  marketTradable: true,
};

describe("synthesis engine", () => {
  const model = loadSynthesisModel();

  it("gradeRoll matches reference values for Amber Ring inputs", () => {
    const rareUp = gradeRoll("RARE", model).find((r) => r.step === 1);
    const uncSkip = gradeRoll("UNCOMMON", model).find((r) => r.step === 2);
    expect(rareUp?.pct).toBe(97.56);
    expect(uncSkip?.pct).toBe(3.85);
  });

  it("pathsToItem lists tier-labeled Amber Ring paths with ascending level weights", () => {
    const paths = pathsToItem(AMBER_RING, model);
    expect(paths[0]).toMatchObject({
      inputGrade: "RARE",
      tier: 4,
      minMaterialTier: 3,
      materialAvgLevel: 30,
      resultLevelMin: 30,
      resultLevelMax: 40,
      chance: 20.19,
      pLevel: 75,
      itemPoolPct: 27.59,
    });
    expect(paths).toContainEqual(
      expect.objectContaining({
        inputGrade: "RARE",
        tier: 3,
        minMaterialTier: 2,
        materialAvgLevel: 25,
        chance: 13.46,
      }),
    );
    const keys = paths.map(
      (p) => `${p.inputGrade}|${p.tier}|${p.minMaterialTier}|${p.materialAvgLevel}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("recipeTierResultRange and material average bands use fixed ranges only", () => {
    expect(formatSynthesisResultRange(20, 40)).toBe("Lv 20~40");
    const t4 = recipeTierResultRange(model, "Accessory", 4);
    expect(t4).toEqual({ min: 20, max: 40 });

    const paths = pathsToItem(AMBER_RING, model);
    const bestPath = paths[0]!;
    expect(materialAverageLevelRange(bestPath)).toEqual({ min: 30, max: 34 });
    expect(formatSynthesisPathSetup(bestPath, t4!, { min: 30, max: 34 })).toBe(
      "Tier 4 (Lv 20~40) · Average item Lv 30-34",
    );

    const highAvgPath = paths.find((p) => p.materialAvgLevel === 35)!;
    expect(materialAverageLevelRange(highAvgPath)).toEqual({ min: 35, max: 40 });
    expect(highAvgPath.chance).toBeLessThan(bestPath.chance);

    const tier3Path = paths.find((p) => p.tier === 3 && p.materialAvgLevel === 25)!;
    expect(materialAverageLevelRange(tier3Path)).toEqual({ min: 25, max: 30 });

    for (const path of paths) {
      expect(formatMaterialAverageLevelRange(materialAverageLevelRange(path))).not.toMatch(/\+/);
    }
  });

  it("simulate returns a distribution for a concrete recipe row", () => {
    const outcomes = simulate("RARE", 4, 30, 3, "Accessory", model);
    expect(outcomes.length).toBeGreaterThan(0);
    const amber = outcomes.find((o) => o.itemKey === AMBER_RING.id && o.level === 30);
    expect(amber?.chance).toBe(20.19);
  });
});
