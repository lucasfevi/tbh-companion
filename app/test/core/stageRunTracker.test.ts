import { describe, it, expect } from "vitest";
import { StageRunTracker } from "../../src/core/stageRunTracker";

describe("StageRunTracker", () => {
  it("records a clear and reports it as the stage's first fastest", () => {
    const tracker = new StageRunTracker();
    expect(tracker.recordClear(2305, 85, 1000)).toBe(true);

    const stats = tracker.getStats();
    expect(stats.rows).toEqual([
      { stageKey: 2305, fastestClearTimeSec: 85, lastClearTimeSec: 85, clearCount: 1 },
    ]);
    expect(stats.history).toEqual([
      { wallTime: 1000, stageKey: 2305, clearTimeSec: 85, isFastest: true },
    ]);
    expect(stats.readerRequired).toBe(true);
  });

  it("updates the fastest time only when a new clear is faster", () => {
    const tracker = new StageRunTracker();
    tracker.recordClear(2305, 85, 1000);

    expect(tracker.recordClear(2305, 90, 1001)).toBe(false); // slower — not a new fastest
    let stats = tracker.getStats();
    expect(stats.rows[0]).toEqual({
      stageKey: 2305,
      fastestClearTimeSec: 85,
      lastClearTimeSec: 90,
      clearCount: 2,
    });

    expect(tracker.recordClear(2305, 63, 1002)).toBe(true); // faster — new fastest
    stats = tracker.getStats();
    expect(stats.rows[0]).toEqual({
      stageKey: 2305,
      fastestClearTimeSec: 63,
      lastClearTimeSec: 63,
      clearCount: 3,
    });
  });

  it("tracks multiple stages independently, sorted fastest first", () => {
    const tracker = new StageRunTracker();
    tracker.recordClear(2305, 85, 1000);
    tracker.recordClear(3102, 40, 1001);

    const stats = tracker.getStats();
    expect(stats.rows.map((r) => r.stageKey)).toEqual([3102, 2305]);
  });

  it("ignores non-positive stage keys or clear times", () => {
    const tracker = new StageRunTracker();
    expect(tracker.recordClear(0, 85)).toBe(false);
    expect(tracker.recordClear(2305, 0)).toBe(false);
    expect(tracker.recordClear(-1, 85)).toBe(false);
    expect(tracker.getStats().rows).toEqual([]);
  });

  it("caps visible history and reverses it (most recent first)", () => {
    const tracker = new StageRunTracker();
    for (let i = 0; i < 25; i++) tracker.recordClear(2305, 100 - i, 1000 + i);

    const stats = tracker.getStats();
    expect(stats.history).toHaveLength(20);
    expect(stats.history[0].wallTime).toBe(1024); // most recent first
  });

  it("round-trips through captureSnapshot/applySnapshot", () => {
    const tracker = new StageRunTracker();
    tracker.recordClear(2305, 85, 1000);
    tracker.recordClear(2305, 63, 1002);
    tracker.recordClear(3102, 40, 1001);

    const restored = new StageRunTracker();
    restored.applySnapshot(tracker.captureSnapshot());

    expect(restored.getStats()).toEqual(tracker.getStats());
  });

  it("applySnapshot tolerates a missing/empty snapshot", () => {
    const tracker = new StageRunTracker();
    tracker.applySnapshot({
      fastestByStageKey: {},
      lastByStageKey: {},
      countByStageKey: {},
      history: [],
    });
    expect(tracker.getStats().rows).toEqual([]);
  });
});
