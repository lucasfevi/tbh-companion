import { describe, it, expect } from "vitest";
import { parseSnapshot, GOLD_KEY } from "../../src/core/save/snapshot";

function wrap(player: unknown): string {
  // Mirror the ES3 layout: PlayerSaveData.value is a JSON *string*.
  return JSON.stringify({ PlayerSaveData: { __type: "Player", value: JSON.stringify(player) } });
}

describe("parseSnapshot", () => {
  it("extracts heroes, gold, cube, and stage", () => {
    const player = {
      heroSaveDatas: [
        { heroKey: 101, HeroLevel: 5, HeroExp: 1234, IsUnLock: true },
        { heroKey: 201, HeroLevel: 3, HeroExp: 766, IsUnLock: true },
        { heroKey: 301, HeroLevel: 0, HeroExp: 0, IsUnLock: false },
      ],
      currenySaveDatas: [
        { Key: 999, Quantity: 1 },
        { Key: GOLD_KEY, Quantity: 50000 },
      ],
      cubeSaveLevelData: { Level: 2, Exp: 99 },
      commonSaveData: {
        playTime: 3600,
        currentStageKey: 3205,
        currentStageWave: 7,
        maxCompletedStage: 3209,
      },
    };

    const snap = parseSnapshot(wrap(player), 1000);
    expect(snap.heroes).toHaveLength(3);
    expect(snap.heroes[0]).toEqual({ key: "101", level: 5, exp: 1234, unlocked: true });
    expect(snap.totalHeroExp).toBe(1234 + 766 + 0);
    expect(snap.gold).toBe(50000);
    expect(snap.cubeLevel).toBe(2);
    expect(snap.cubeExp).toBe(99);
    expect(snap.stageKey).toBe(3205);
    expect(snap.stageWave).toBe(7);
    expect(snap.maxStage).toBe(3209);
    expect(snap.saveMtime).toBe(1000);
  });

  it("defaults gracefully when fields are missing", () => {
    const snap = parseSnapshot(wrap({}), 0);
    expect(snap.heroes).toHaveLength(0);
    expect(snap.totalHeroExp).toBe(0);
    expect(snap.gold).toBe(0);
    expect(snap.stageKey).toBe(0);
  });

  it("throws when PlayerSaveData is malformed", () => {
    expect(() => parseSnapshot(JSON.stringify({ foo: 1 }), 0)).toThrow();
  });
});
