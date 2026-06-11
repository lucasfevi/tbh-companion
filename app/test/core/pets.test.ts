import { describe, expect, it } from "vitest";
import {
  aggregatePassiveBonuses,
  buildPetState,
  expectedKillsPerClear,
  formatRunsMessage,
  loadPetCatalog,
  parseArrangedPetKey,
  parseMonsterKillCounts,
  parsePetSaveData,
  runsToUnlock,
} from "../../src/core/pets";

function wrapPlayer(inner: Record<string, unknown>): string {
  return JSON.stringify({ PlayerSaveData: { value: JSON.stringify(inner) } });
}

describe("pets farm math", () => {
  it("computes expected kills and runs like TBH.City pet-farm", () => {
    expect(expectedKillsPerClear(400, 37)).toBeCloseTo(148, 0);
    expect(runsToUnlock(5000, 148.2)).toBe(34);
    expect(runsToUnlock(2600, 148.2)).toBe(18);
    expect(formatRunsMessage(18, false)).toBe("~18 more runs on this stage to unlock");
    expect(formatRunsMessage(0, true)).toBe("Unlocked");
  });
});

describe("parsePetSaveData", () => {
  it("reads PetSaveData and arranged pet", () => {
    const text = wrapPlayer({
      PetSaveData: [
        { PetKey: 1001, IsUnlock: false, IsViewed: false },
        { PetKey: 6001, IsUnlock: true, IsViewed: true },
      ],
      commonSaveData: { ArrangedPetKey: 1001 },
      aggregateSaveDatas: [
        { Type: 0, SubKey: 10031, Value: 2400 },
        { Type: 0, SubKey: 0, Value: 99999 },
      ],
    });

    expect(parsePetSaveData(text)).toEqual([
      { petKey: 1001, unlocked: false, viewed: false },
      { petKey: 6001, unlocked: true, viewed: true },
    ]);
    expect(parseArrangedPetKey(text)).toBe(1001);
    expect(parseMonsterKillCounts(text).get(10031)).toBe(2400);
  });
});

describe("aggregatePassiveBonuses", () => {
  it("sums matching bonus lines from unlocked pets", () => {
    const catalog = loadPetCatalog();
    const state = buildPetState(
      catalog,
      [
        { petKey: 1001, unlocked: true, viewed: true },
        { petKey: 1004, unlocked: true, viewed: true },
        { petKey: 6001, unlocked: true, viewed: true },
      ],
      new Map(),
      0,
      100,
    );

    expect(aggregatePassiveBonuses(state.pets)).toEqual([
      "+25% common chest drop",
      "+30% EXP gain",
    ]);
  });

  it("ignores locked pets", () => {
    const catalog = loadPetCatalog();
    const state = buildPetState(
      catalog,
      [{ petKey: 1001, unlocked: false, viewed: false }],
      new Map(),
      0,
      100,
    );

    expect(aggregatePassiveBonuses(state.pets)).toEqual([]);
  });
});

describe("buildPetState", () => {
  it("resolves kill progress and per-stage farm hints", () => {
    const catalog = loadPetCatalog();
    const bat = catalog.pets.find((p) => p.petKey === 1001)!;
    const hellStage = bat.bestFarmStages!.find((s) => s.stageKey === 3107)!;

    const state = buildPetState(
      catalog,
      [{ petKey: 1001, unlocked: false, viewed: false }],
      new Map([[10031, 2400]]),
      0,
      100,
    );

    const row = state.pets.find((p) => p.petKey === 1001)!;
    expect(row.killCount).toBe(2400);
    expect(row.killsRemaining).toBe(2600);
    expect(row.progressPct).toBeCloseTo(48, 0);
    expect(row.bestStages).toHaveLength(3);
    expect(row.appearsOnStages?.length).toBeGreaterThan(0);

    const hell = row.bestStages!.find((s) => s.stageKey === 3107)!;
    const expected = expectedKillsPerClear(hellStage.monstersPerClear, hellStage.spawnPercent);
    expect(hell.expectedKillsPerClear).toBeCloseTo(expected, 1);
    expect(hell.spawnPercent).toBe(37);
    expect(hell.difficultyLabel).toBe("Hell 1-7");
    expect(hell.locationName).toBe("City Outskirts");
    expect(hell.runsMessage).toContain("more runs");
    expect(runsToUnlock(2600, expected)).toBeGreaterThan(0);
  });

  it("omits farm hints when unlocked but keeps best stages", () => {
    const catalog = loadPetCatalog();
    const state = buildPetState(
      catalog,
      [{ petKey: 1001, unlocked: true, viewed: true }],
      new Map([[10031, 6000]]),
      0,
      100,
    );
    const bat = state.pets.find((p) => p.petKey === 1001)!;
    expect(bat.bestStages).toHaveLength(3);
    expect(bat.bestStages!.every((s) => s.runsMessage == null)).toBe(true);
  });

  it("marks DLC pets without farm stages", () => {
    const catalog = loadPetCatalog();
    const state = buildPetState(catalog, [], new Map(), 6003, 100);
    const dragon = state.pets.find((p) => p.petKey === 6003)!;
    expect(dragon.unlockKind).toBe("dlc");
    expect(dragon.bestStages).toBeUndefined();
    expect(dragon.equipped).toBe(true);
  });
});
