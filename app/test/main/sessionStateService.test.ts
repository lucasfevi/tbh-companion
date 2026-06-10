import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { XpTracker } from "../../src/core/tracker";
import type { AppConfig, SaveSnapshot } from "../../shared/types";
import { SESSION_STATE_FILE } from "../../src/main/services/appData";

vi.mock("electron", () => ({
  app: {
    getPath: () => userDataDir,
  },
}));

let userDataDir = "";

const config: AppConfig = {
  savePath: "C:/game/save.es3",
  es3Password: "x",
  pollIntervalSeconds: 5,
  rollingWindowMinutes: 5,
  trackCubeExp: false,
  startTopmost: true,
  logHistoryCsv: false,
  currency: "USD",
};

function snap(mtime: number, heroExp: number): SaveSnapshot {
  return {
    heroes: [{ key: "101", level: 1, exp: heroExp, unlocked: true }],
    totalHeroExp: heroExp,
    cubeLevel: 0,
    cubeExp: 0,
    playTime: 0,
    saveMtime: mtime,
    stageKey: 3205,
    stageWave: 1,
    maxStage: 0,
    gold: 0,
  };
}

describe("SessionStateService", () => {
  beforeEach(() => {
    userDataDir = mkdtempSync(join(tmpdir(), "tbh-session-"));
    vi.resetModules();
  });

  afterEach(() => {
    rmSync(userDataDir, { recursive: true, force: true });
  });

  async function loadService() {
    const { SessionStateService } = await import("../../src/main/services/SessionStateService");
    return new SessionStateService();
  }

  it("persists and restores tracker state for matching save", async () => {
    const tracker = new XpTracker(300, false);
    tracker.update(snap(1000, 0));
    tracker.update(snap(1060, 600));

    const svc = await loadService();
    svc.persist(tracker, snap(1060, 600), config);

    const path = join(userDataDir, SESSION_STATE_FILE);
    expect(existsSync(path)).toBe(true);

    const svc2 = await loadService();
    svc2.load(config);
    const fresh = new XpTracker(300, false);
    expect(svc2.tryRestoreOnSnapshot(fresh, snap(1060, 600))).toBe("restored");
    fresh.update(snap(1060, 600));
    expect(fresh.cumulativeGained).toBe(600);
    expect(fresh.history).toHaveLength(1);
  });

  it("discards snapshot when save mtime rolled back", async () => {
    const tracker = new XpTracker(300, false);
    tracker.update(snap(2000, 0));
    tracker.update(snap(2060, 500));

    const svc = await loadService();
    svc.persist(tracker, snap(2060, 500), config);

    const svc2 = await loadService();
    svc2.load(config);
    const fresh = new XpTracker(300, false);
    expect(svc2.tryRestoreOnSnapshot(fresh, snap(1999, 500))).toBe("discarded");
    expect(svc2.getStatusOverride()).toBe("New session");
    expect(existsSync(join(userDataDir, SESSION_STATE_FILE))).toBe(false);
  });

  it("loads UI flags even when tracker metadata mismatches", async () => {
    writeFileSync(
      join(userDataDir, SESSION_STATE_FILE),
      JSON.stringify({
        version: 1,
        savePath: "C:/other/save.es3",
        lastSaveMtime: 1,
        rollingWindowMinutes: 5,
        trackCubeExp: false,
        tracker: new XpTracker(300, false).captureSnapshot(),
        ui: { miniOverlayOpen: true, boxTrackerOpen: true },
      }),
    );

    const svc = await loadService();
    const ui = svc.load(config);
    expect(ui.miniOverlayOpen).toBe(true);
    expect(ui.boxTrackerOpen).toBe(true);
  });

  it("writes reset session while keeping UI flags", async () => {
    const tracker = new XpTracker(300, false);
    tracker.update(snap(1000, 0));
    tracker.update(snap(1060, 600));

    const svc = await loadService();
    svc.setMiniOverlayOpen(true);
    svc.persist(tracker, snap(1060, 600), config);
    tracker.reset();
    svc.onTrackerReset(tracker, config, snap(1060, 600));

    const raw = JSON.parse(readFileSync(join(userDataDir, SESSION_STATE_FILE), "utf-8")) as {
      tracker: { cumulativeGained: number };
      ui: { miniOverlayOpen: boolean };
    };
    expect(raw.tracker.cumulativeGained).toBe(0);
    expect(raw.ui.miniOverlayOpen).toBe(true);
  });
});
