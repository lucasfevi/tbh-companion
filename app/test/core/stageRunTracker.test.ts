import { describe, it, expect } from "vitest";
import { StageRunTracker } from "../../src/core/stageRunTracker";

describe("StageRunTracker", () => {
  it("records a clear with its duration and XP/gold gained", () => {
    const tracker = new StageRunTracker();
    tracker.recordClear(2305, 85, 400, 12_000, 1000);

    const stats = tracker.getStats();
    expect(stats.history).toEqual([
      { wallTime: 1000, stageKey: 2305, clearTimeSec: 85, xpGained: 400, goldGained: 12_000 },
    ]);
    expect(stats.readerRequired).toBe(true);
  });

  it("ignores non-positive stage keys or clear times", () => {
    const tracker = new StageRunTracker();
    tracker.recordClear(0, 85, 10, 10);
    tracker.recordClear(2305, 0, 10, 10);
    tracker.recordClear(-1, 85, 10, 10);
    expect(tracker.getStats().history).toEqual([]);
  });

  it("clamps negative xp/gold gained to zero (defensive against clock/read jitter)", () => {
    const tracker = new StageRunTracker();
    tracker.recordClear(2305, 85, -5, -10, 1000);
    expect(tracker.getStats().history[0]).toMatchObject({ xpGained: 0, goldGained: 0 });
  });

  it("caps visible history and reverses it (most recent first)", () => {
    const tracker = new StageRunTracker();
    for (let i = 0; i < 25; i++) tracker.recordClear(2305, 100 - i, i, i, 1000 + i);

    const stats = tracker.getStats();
    expect(stats.history).toHaveLength(20);
    expect(stats.history[0].wallTime).toBe(1024); // most recent first
  });

  it("round-trips through captureSnapshot/applySnapshot", () => {
    const tracker = new StageRunTracker();
    tracker.recordClear(2305, 85, 400, 12_000, 1000);
    tracker.recordClear(3102, 40, 200, 6_000, 1001);

    const restored = new StageRunTracker();
    restored.applySnapshot(tracker.captureSnapshot());

    expect(restored.getStats()).toEqual(tracker.getStats());
  });

  it("applySnapshot tolerates a missing/empty snapshot", () => {
    const tracker = new StageRunTracker();
    tracker.applySnapshot({ history: [] });
    expect(tracker.getStats().history).toEqual([]);
  });

  it("applySnapshot rejects non-array history", () => {
    const tracker = new StageRunTracker();
    tracker.recordClear(2305, 85, 400, 12_000, 1000);
    tracker.applySnapshot({ history: null as unknown as [] });
    expect(tracker.getStats().history).toEqual([]);
  });

  it("applySnapshot filters invalid entries and caps to the most recent 200", () => {
    const valid = {
      wallTime: 1000,
      stageKey: 2305,
      clearTimeSec: 85,
      xpGained: 400,
      goldGained: 12_000,
    };
    const invalid = [
      null,
      { wallTime: 1, stageKey: 0, clearTimeSec: 10, xpGained: 1, goldGained: 1 },
      { wallTime: "bad", stageKey: 2305, clearTimeSec: 85, xpGained: 1, goldGained: 1 },
    ];
    const overflow = Array.from({ length: 205 }, (_, i) => ({
      ...valid,
      wallTime: 1000 + i,
      stageKey: 2300 + i,
    }));

    const tracker = new StageRunTracker();
    tracker.applySnapshot({ history: [...invalid, ...overflow] as never[] });

    expect(tracker.captureSnapshot().history).toHaveLength(200);
    expect(tracker.captureSnapshot().history[0].wallTime).toBe(1005); // oldest kept
    expect(tracker.captureSnapshot().history[199].wallTime).toBe(1204); // newest kept
    expect(tracker.getStats().history).toHaveLength(20);
    expect(tracker.getStats().history[0].wallTime).toBe(1204); // visible: most recent first
  });
});
