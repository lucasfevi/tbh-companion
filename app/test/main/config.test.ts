import { describe, it, expect, vi, beforeEach } from "vitest";
import { DEFAULT_NOTIFICATION_PREFS } from "../../shared/notificationCatalog";

// Dynamic import so electron mock is established before the module evaluates.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type ConfigModule = typeof import("../../src/main/config");
let mod: ConfigModule;

vi.mock("electron", () => ({
  app: {
    getPath: () => "/tmp/tbh-test-userdata",
  },
}));

beforeEach(async () => {
  vi.resetModules();
  mod = await import("../../src/main/config");
});

describe("normalizeConfigFromRaw", () => {
  it("migrates legacy chestSoundVariant to notificationPrefs", () => {
    const cfg = mod.normalizeConfigFromRaw({ chestSoundVariant: "double-tap" });
    expect(cfg.notificationPrefs.chestReady).toEqual({ enabled: true, sound: "double-tap" });
    expect(cfg.notificationPrefs.chestDrop).toEqual(DEFAULT_NOTIFICATION_PREFS.chestDrop);
  });

  it("sanitizes invalid notification sound ids", () => {
    const cfg = mod.normalizeConfigFromRaw({
      notificationPrefs: {
        ...DEFAULT_NOTIFICATION_PREFS,
        heroLevelUp: { enabled: true, sound: "not-valid" as "soft-chime" },
      },
    });
    expect(cfg.notificationPrefs.heroLevelUp.sound).toBe(
      DEFAULT_NOTIFICATION_PREFS.heroLevelUp.sound,
    );
  });

  it("applies defaults for an empty raw config", () => {
    const cfg = mod.normalizeConfigFromRaw({});
    expect(cfg.notificationPrefs).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(cfg.savePath).toContain("SaveFile_Live.es3");
  });
});
