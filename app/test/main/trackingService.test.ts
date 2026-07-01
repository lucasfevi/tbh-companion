import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LiveMemorySnapshot, SaveSnapshot } from "../../shared/types";
import { DEFAULT_NOTIFICATION_PREFS } from "../../shared/notificationCatalog";

vi.mock("../../src/main/saveWatcher", () => ({
  SaveWatcher: class {
    constructor(opts: { onSnapshot: (snap: SaveSnapshot) => void }) {
      onSnapshot = opts.onSnapshot;
    }
    start = vi.fn();
    stop = vi.fn();
  },
}));

vi.mock("../../src/main/services/broadcast", () => ({
  broadcast: vi.fn(),
}));

vi.mock("../../src/main/log", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("../../src/main/historyLog", () => ({
  makeHistoryLogger: vi.fn(),
}));

import { TrackingService } from "../../src/main/services/TrackingService";

const baseConfig = {
  savePath: "C:/game/save.es3",
  es3Password: "x",
  pollIntervalSeconds: 5,
  rollingWindowMinutes: 5,
  startTopmost: true,
  logHistoryCsv: false,
  currency: "USD",
  notificationsEnabled: true,
  notifyOnUpdateAvailable: true,
  notificationVolume: 100,
  notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
  inventoryAlmostFullThresholdPercent: 90,
  chestAutoOpenEnabled: { common: false, stageBoss: false },
  liveMemory: { enabled: false, consentAccepted: false },
};

let onSnapshot: ((snap: SaveSnapshot) => void) | undefined;

function snap(level: number, mtime = 100, heroExp = 100): SaveSnapshot {
  return {
    heroes: [{ key: "101", level, exp: heroExp, unlocked: true }],
    totalHeroExp: heroExp,
    playTime: 0,
    saveMtime: mtime,
    stageKey: 3205,
    stageWave: 1,
    maxStage: 0,
    gold: 0,
  };
}

describe("TrackingService hero level-up callback", () => {
  beforeEach(() => {
    onSnapshot = undefined;
    vi.clearAllMocks();
  });

  it("does not fire on the first snapshot", () => {
    const onHeroLevelUp = vi.fn();
    const svc = new TrackingService(vi.fn(), undefined, undefined, undefined, onHeroLevelUp);
    svc.start(baseConfig);
    onSnapshot?.(snap(5));
    expect(onHeroLevelUp).not.toHaveBeenCalled();
    svc.stop();
  });

  it("fires when a hero level increases on a later snapshot", () => {
    const onHeroLevelUp = vi.fn();
    const svc = new TrackingService(vi.fn(), undefined, undefined, undefined, onHeroLevelUp);
    svc.start(baseConfig);
    onSnapshot?.(snap(5, 100));
    onSnapshot?.(snap(6, 101));
    expect(onHeroLevelUp).toHaveBeenCalledTimes(1);
    expect(onHeroLevelUp).toHaveBeenCalledWith([{ key: "101", previousLevel: 5, newLevel: 6 }]);
    svc.stop();
  });

  it("batches multiple hero level-ups from one snapshot into a single callback", () => {
    const onHeroLevelUp = vi.fn();
    const svc = new TrackingService(vi.fn(), undefined, undefined, undefined, onHeroLevelUp);
    svc.start(baseConfig);
    onSnapshot?.({
      ...snap(5, 100),
      heroes: [
        { key: "101", level: 5, exp: 100, unlocked: true },
        { key: "201", level: 2, exp: 50, unlocked: true },
      ],
    });
    onSnapshot?.({
      ...snap(6, 101),
      heroes: [
        { key: "101", level: 6, exp: 10, unlocked: true },
        { key: "201", level: 3, exp: 5, unlocked: true },
      ],
    });
    expect(onHeroLevelUp).toHaveBeenCalledTimes(1);
    expect(onHeroLevelUp).toHaveBeenCalledWith([
      { key: "101", previousLevel: 5, newLevel: 6 },
      { key: "201", previousLevel: 2, newLevel: 3 },
    ]);
    svc.stop();
  });
});

describe("TrackingService.onLiveMemoryToggled", () => {
  beforeEach(() => {
    onSnapshot = undefined;
    vi.clearAllMocks();
  });

  it("clears inflated session stats and re-seeds from the last save snapshot", () => {
    const svc = new TrackingService(vi.fn());
    svc.start(baseConfig);
    onSnapshot?.(snap(5, 1000, 0));
    onSnapshot?.(snap(5, 1060, 600)); // +600 XP

    // Simulate corrupted session totals from a prior live/save mix.
    const tracker = svc.getTracker();
    tracker.applySnapshot({
      ...tracker.captureSnapshot(),
      cumulativeGained: 8e28,
      sessionRateValue: 8e28,
    });

    svc.onLiveMemoryToggled();

    expect(svc.getTracker().cumulativeGained).toBe(0);
    expect(svc.getTracker().rollingRate).toBe(0);
    expect(svc.getStats().cumulativeGained).toBe(0);
  });

  it("feeds live heroes into the tracker for XP rate sampling", () => {
    const svc = new TrackingService(vi.fn());
    svc.start(baseConfig);
    onSnapshot?.(snap(5, 1000, 0));

    const frame: LiveMemorySnapshot = {
      connected: true,
      stageKey: 3205,
      stageWave: 1,
      gold: 1000,
      heroes: [{ heroKey: 101, level: 5, exp: 500 }],
      boxCount: null,
      inventoryItems: null,
      petData: null,
      source: "memory test",
      readMs: 1,
      at: 2000,
    };
    svc.ingestLiveFrame(frame);
    svc.ingestLiveFrame({
      ...frame,
      at: 3000,
      heroes: [{ heroKey: 101, level: 5, exp: 1100 }],
    });

    expect(svc.getTracker().cumulativeGained).toBe(600);
    expect(svc.getTracker().rollingRate).toBeGreaterThan(0);
  });
});
