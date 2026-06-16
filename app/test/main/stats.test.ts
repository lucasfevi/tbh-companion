import { describe, it, expect } from "vitest";
import { XpTracker } from "../../src/core/tracker";
import { ChestDropTracker } from "../../src/core/chestDropTracker";
import { buildStats } from "../../src/main/stats";
import type { SaveSnapshot } from "../../shared/types";

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

    const stats = buildStats(tracker, chestDropTracker, true, snap(1000), null, null);
    expect(stats.chestDrops.commonTotal).toBe(1);
    expect(stats.chestDrops.combinedTotal).toBe(1);
    expect(stats.chestDrops.playerLogAvailable).toBe(true);
    expect(stats.chestDrops.breakdown[0]?.name).toBe("Normal Monster Box Lv15");
  });
});
