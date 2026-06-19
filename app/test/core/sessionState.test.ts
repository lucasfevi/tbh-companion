import { describe, it, expect } from "vitest";
import {
  isPersistedSessionState,
  sessionMatchesConfig,
  snapshotContinuesSession,
} from "../../src/core/sessionState";
import { DEFAULT_NOTIFICATION_PREFS } from "../../shared/notificationCatalog";
import type { AppConfig, PersistedSessionState } from "../../shared/types";

const config: AppConfig = {
  savePath: "%USERPROFILE%/save.es3",
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
  chestAutoOpenEnabled: { common: false, stageBoss: false, actBoss: false },
};

describe("sessionState", () => {
  it("sessionMatchesConfig compares path and tracking settings", () => {
    const meta = {
      savePath: "C:/game/save.es3",
      rollingWindowMinutes: 5,
    };
    expect(sessionMatchesConfig(meta, "C:/game/save.es3", config)).toBe(true);
    expect(sessionMatchesConfig(meta, "C:/other/save.es3", config)).toBe(false);
    expect(
      sessionMatchesConfig({ ...meta, rollingWindowMinutes: 10 }, "C:/game/save.es3", config),
    ).toBe(false);
  });

  it("snapshotContinuesSession allows same or newer mtime only", () => {
    const snap = {
      saveMtime: 2000,
    } as PersistedSessionState["tracker"] & { saveMtime: number };
    expect(snapshotContinuesSession(2000, { saveMtime: 2000 } as never)).toBe(true);
    expect(snapshotContinuesSession(2000, { saveMtime: 2100 } as never)).toBe(true);
    expect(snapshotContinuesSession(2000, { saveMtime: 1999 } as never)).toBe(false);
    void snap;
  });

  it("isPersistedSessionState validates file shape", () => {
    const valid: PersistedSessionState = {
      version: 1,
      savePath: "x",
      lastSaveMtime: 1,
      rollingWindowMinutes: 5,
      tracker: {
        sessionStart: 1,
        cumulativeGained: 0,
        currentTotalXp: 0,
        currentGold: 0,
        goldGained: 0,
        heroes: [],
        history: [],
        lastGainMtime: null,
        prevHero: {},
        heroMeters: {},
        samples: [],
        initialized: false,
        firstMtime: null,
        lastChangeMtime: null,
        rollingRateValue: 0,
        sessionRateValue: 0,
        prevGold: null,
        goldSamples: [],
        goldFirstMtime: null,
        goldLastChangeMtime: null,
        goldRollingRateValue: 0,
        goldSessionRateValue: 0,
      },
      ui: { miniOverlayOpen: false, boxTrackerOpen: true },
    };
    expect(isPersistedSessionState(valid)).toBe(true);
    expect(isPersistedSessionState({ version: 2 })).toBe(false);
  });
});
