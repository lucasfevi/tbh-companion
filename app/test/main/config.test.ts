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
    expect(cfg.notificationVolume).toBe(100);
    expect(cfg.savePath).toContain("SaveFile_Live.es3");
  });

  it("sanitizes notification volume", () => {
    expect(mod.normalizeConfigFromRaw({ notificationVolume: 200 }).notificationVolume).toBe(100);
    expect(mod.normalizeConfigFromRaw({ notificationVolume: -1 }).notificationVolume).toBe(0);
    expect(mod.normalizeConfigFromRaw({ notificationVolume: 42.6 }).notificationVolume).toBe(43);
  });

  it("defaults inventoryAlmostFullThresholdPercent to 90", () => {
    expect(mod.normalizeConfigFromRaw({}).inventoryAlmostFullThresholdPercent).toBe(90);
  });

  it("defaults chestAutoOpenEnabled to all false", () => {
    expect(mod.normalizeConfigFromRaw({}).chestAutoOpenEnabled).toEqual({
      common: false,
      stageBoss: false,
    });
  });

  it("sanitizes partial/malformed chestAutoOpenEnabled", () => {
    expect(
      mod.normalizeConfigFromRaw({
        chestAutoOpenEnabled: { common: true } as never,
      }).chestAutoOpenEnabled,
    ).toEqual({ common: true, stageBoss: false });
  });

  it("clamps inventoryAlmostFullThresholdPercent to 50-100", () => {
    expect(
      mod.normalizeConfigFromRaw({ inventoryAlmostFullThresholdPercent: 10 })
        .inventoryAlmostFullThresholdPercent,
    ).toBe(50);
    expect(
      mod.normalizeConfigFromRaw({ inventoryAlmostFullThresholdPercent: 150 })
        .inventoryAlmostFullThresholdPercent,
    ).toBe(100);
  });
});
