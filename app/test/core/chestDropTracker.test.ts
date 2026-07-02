import { describe, it, expect } from "vitest";
import { ChestDropTracker, resolveStageBoxDrop } from "../../src/core/chestDropTracker";

describe("resolveStageBoxDrop", () => {
  it("resolves common and rare stage boxes from catalog", () => {
    const common = resolveStageBoxDrop(910151);
    expect(common).toEqual({
      itemKey: 910151,
      name: "Normal Monster Box Lv15",
      category: "common",
    });

    const rare = resolveStageBoxDrop(920151);
    expect(rare?.category).toBe("rare");
    expect(rare?.itemKey).toBe(920151);
  });

  it("resolves Normal Monster Box Lv65 from catalog", () => {
    expect(resolveStageBoxDrop(910651)?.name).toBe("Normal Monster Box Lv65");
  });

  it("ignores act boss boxes", () => {
    expect(resolveStageBoxDrop(930151)).toBeNull();
  });

  it("falls back to prefix for unknown keys in range", () => {
    expect(resolveStageBoxDrop(910999)?.category).toBe("common");
    expect(resolveStageBoxDrop(920999)?.category).toBe("rare");
  });

  it("canonicalizes duplicate rare ItemKeys to tracker ids", () => {
    const resolved = resolveStageBoxDrop(920004);
    expect(resolved?.itemKey).toBe(920003);
    expect(resolved?.category).toBe("rare");
  });
});

describe("ChestDropTracker", () => {
  it("records log drops by exact chest name", () => {
    const tracker = new ChestDropTracker();
    expect(tracker.recordLogDrop(910151)).toBe(true);
    expect(tracker.recordLogDrop(920151)).toBe(true);
    expect(tracker.recordLogDrop(930151)).toBe(false);

    const stats = tracker.getStats(3600);
    expect(stats.commonTotal).toBe(1);
    expect(stats.rareTotal).toBe(1);
    expect(stats.combinedTotal).toBe(2);
    expect(stats.commonPerHour).toBe(1);
    expect(stats.rarePerHour).toBe(1);
    expect(stats.breakdown).toHaveLength(2);
    expect(stats.breakdown.every((row) => row.itemKey > 0)).toBe(true);
  });

  it("aggregates repeated log drops for the same chest", () => {
    const tracker = new ChestDropTracker();
    tracker.recordLogDrop(910651);
    tracker.recordLogDrop(910651);
    tracker.recordLogDrop(910651);

    const stats = tracker.getStats(3600);
    expect(stats.commonTotal).toBe(3);
    expect(stats.breakdown).toEqual([
      expect.objectContaining({ itemKey: 910651, name: "Normal Monster Box Lv65", count: 3 }),
    ]);
  });

  it("records drop history newest first", () => {
    const tracker = new ChestDropTracker();
    tracker.recordLogDrop(910151, 1000);
    tracker.recordLogDrop(920151, 1010);

    const stats = tracker.getStats(3600);
    expect(stats.history).toHaveLength(2);
    expect(stats.history[0]?.itemKey).toBe(920151);
    expect(stats.history[1]?.itemKey).toBe(910151);
  });

  it("round-trips snapshot restore", () => {
    const tracker = new ChestDropTracker();
    tracker.recordLogDrop(910151);
    const snap = tracker.captureSnapshot();

    const restored = new ChestDropTracker();
    restored.applySnapshot(snap);
    restored.recordLogDrop(920151);

    const stats = restored.getStats(7200, true);
    expect(stats.commonTotal).toBe(1);
    expect(stats.rareTotal).toBe(1);
  });

  it("reset clears session counts", () => {
    const tracker = new ChestDropTracker();
    tracker.recordLogDrop(910151);
    tracker.reset();
    const stats = tracker.getStats(3600);
    expect(stats.combinedTotal).toBe(0);
    expect(stats.history).toHaveLength(0);
  });

  it("getStats always returns readerRequired: true", () => {
    const tracker = new ChestDropTracker();
    expect(tracker.getStats(3600).readerRequired).toBe(true);
  });
});

describe("ChestDropTracker.recordLiveChestDrop", () => {
  it("records a stage boss (rare) drop into the rare bucket", () => {
    const tracker = new ChestDropTracker();
    tracker.recordLiveChestDrop("rare", 1000);
    const stats = tracker.getStats(3600);
    expect(stats.rareTotal).toBe(1);
    expect(stats.commonTotal).toBe(0);
    expect(stats.combinedTotal).toBe(1);
  });

  it("records a common drop into the common bucket", () => {
    const tracker = new ChestDropTracker();
    tracker.recordLiveChestDrop("common", 1000);
    const stats = tracker.getStats(3600);
    expect(stats.commonTotal).toBe(1);
    expect(stats.rareTotal).toBe(0);
  });

  it("aggregates repeated same-category drops under one breakdown row", () => {
    const tracker = new ChestDropTracker();
    tracker.recordLiveChestDrop("common", 1000);
    tracker.recordLiveChestDrop("common", 1001);
    tracker.recordLiveChestDrop("rare", 1002);
    const stats = tracker.getStats(3600);
    expect(stats.commonTotal).toBe(2);
    expect(stats.rareTotal).toBe(1);
    // Two categories → two breakdown rows.
    expect(stats.breakdown).toHaveLength(2);
    expect(stats.history).toHaveLength(3);
  });

  it("drops legacy act-boss rows when restoring an older snapshot", () => {
    const tracker = new ChestDropTracker();
    tracker.applySnapshot({
      countsByKey: { "900910": 1, "900930": 2 },
      namesByKey: { "900910": "Common chest", "900930": "Act boss chest" },
      categoriesByKey: { "900910": "common", "900930": "actBoss" as "common" },
      history: [
        { wallTime: 1000, itemKey: 900910, name: "Common chest", category: "common" },
        {
          wallTime: 1001,
          itemKey: 900930,
          name: "Act boss chest",
          category: "actBoss" as "common",
        },
      ],
    });

    const stats = tracker.getStats(3600);
    expect(stats.commonTotal).toBe(1);
    expect(stats.combinedTotal).toBe(1);
    expect(stats.history).toHaveLength(1);
    expect(tracker.captureSnapshot().countsByKey).toEqual({ "900910": 1 });
  });
});
