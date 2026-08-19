import { describe, it, expect } from "vitest";
import { XpTracker } from "../../src/core/tracker";
import { ChestDropTracker } from "../../src/core/chestDropTracker";
import { buildStats } from "../../src/main/stats";
import type { LiveMemorySnapshot, SaveSnapshot } from "../../shared/types";

function snap(mtime: number): SaveSnapshot {
  return {
    heroes: [{ key: "101", level: 1, exp: 100, unlocked: true }],
    totalHeroExp: 100,
    playTime: 0,
    saveMtime: mtime,
    stageKey: 3205,
    stageWave: 1,
    maxStage: 0,
    gold: 0,
  };
}

describe("buildStats", () => {
  it("includes chest drop session stats", () => {
    const tracker = new XpTracker(300);
    const chestDropTracker = new ChestDropTracker();
    tracker.update(snap(1000));
    chestDropTracker.recordLogDrop(910151);

    const stats = buildStats(tracker, chestDropTracker, snap(1000), null, null);
    expect(stats.chestDrops.commonTotal).toBe(1);
    expect(stats.chestDrops.combinedTotal).toBe(1);
    expect(stats.chestDrops.readerRequired).toBe(true);
    expect(stats.chestDrops.breakdown[0]?.name).toBe("Normal Monster Box Lv15");
  });

  it("prefers live hero levels and rates when live XP is active", () => {
    const tracker = new XpTracker(300);
    tracker.update(snap(1000));
    const now = Date.now() / 1000;
    tracker.updateLive({ gold: null, heroes: [{ heroKey: 101, level: 1, exp: 100 }] }, now);
    tracker.updateLive({ gold: null, heroes: [{ heroKey: 101, level: 12, exp: 200 }] }, now + 1);

    const liveFrame: LiveMemorySnapshot = {
      connected: true,
      stageKey: 9999,
      stageWave: 3,
      gold: null,
      heroes: [{ heroKey: 101, level: 12, exp: 200 }],
      boxCount: null,
      inventoryItems: null,
      petData: null,
      source: "test",
      readMs: 1,
      at: now * 1000,
    };

    const stats = buildStats(tracker, new ChestDropTracker(), snap(1000), null, null, liveFrame);
    expect(stats.heroes).toHaveLength(1);
    expect(stats.heroes[0]?.level).toBe(12);
    expect(stats.heroes[0]?.rate).toBeGreaterThan(0);
    expect(stats.stageKey).toBe(9999);
    expect(stats.stageWave).toBe(3);
  });
});
