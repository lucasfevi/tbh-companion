import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SaveSnapshot } from "../../shared/types";
import { DEFAULT_NOTIFICATION_PREFS } from "../../shared/notificationCatalog";

let onSnapshot: ((snap: SaveSnapshot) => void) | undefined;

vi.mock("../../src/main/saveWatcher", () => ({
  SaveWatcher: class {
    constructor(opts: { onSnapshot: (snap: SaveSnapshot) => void }) {
      onSnapshot = opts.onSnapshot;
    }
    start = vi.fn();
    stop = vi.fn();
  },
}));

vi.mock("../../src/main/playerLogWatcher", () => ({
  PlayerLogWatcher: class {
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
};

function snap(level: number, mtime = 100): SaveSnapshot {
  return {
    heroes: [{ key: "101", level, exp: 100, unlocked: true }],
    totalHeroExp: 100,
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
    const svc = new TrackingService(
      vi.fn(),
      undefined,
      undefined,
      undefined,
      undefined,
      onHeroLevelUp,
    );
    svc.start(baseConfig);
    onSnapshot?.(snap(5));
    expect(onHeroLevelUp).not.toHaveBeenCalled();
    svc.stop();
  });

  it("fires when a hero level increases on a later snapshot", () => {
    const onHeroLevelUp = vi.fn();
    const svc = new TrackingService(
      vi.fn(),
      undefined,
      undefined,
      undefined,
      undefined,
      onHeroLevelUp,
    );
    svc.start(baseConfig);
    onSnapshot?.(snap(5, 100));
    onSnapshot?.(snap(6, 101));
    expect(onHeroLevelUp).toHaveBeenCalledTimes(1);
    expect(onHeroLevelUp).toHaveBeenCalledWith([{ key: "101", previousLevel: 5, newLevel: 6 }]);
    svc.stop();
  });

  it("batches multiple hero level-ups from one snapshot into a single callback", () => {
    const onHeroLevelUp = vi.fn();
    const svc = new TrackingService(
      vi.fn(),
      undefined,
      undefined,
      undefined,
      undefined,
      onHeroLevelUp,
    );
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
