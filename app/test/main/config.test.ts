import { describe, it, expect, vi, beforeEach } from "vitest";
import { DEFAULT_NOTIFICATION_PREFS } from "../../shared/notificationCatalog";
import type { AppConfig } from "../../src/main/config";

// -- platform mock helpers --
const mockPlatform = vi.hoisted(() => ({ value: "linux" }));
vi.mock("node:os", () => ({
  platform: () => mockPlatform.value,
}));

vi.mock("electron", () => ({
  app: {
    getPath: () => "/tmp/tbh-test-userdata",
  },
}));

// Dynamic import so mocks are established before the module evaluates.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type ConfigModule = typeof import("../../src/main/config");
let mod: ConfigModule;

beforeEach(async () => {
  vi.resetModules();
  mockPlatform.value = "linux";
  mod = await import("../../src/main/config");
});

// ---------------------------------------------------------------------------
// normalizeConfigFromRaw — notification prefs migration
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// getDefaultSavePathCandidates — pure function, no I/O
// ---------------------------------------------------------------------------
describe("getDefaultSavePathCandidates", () => {
  it("returns 3 candidates in priority order", () => {
    const candidates = mod.getDefaultSavePathCandidates("/home/user");
    expect(candidates).toHaveLength(3);
  });

  it("sets Arch/Omarchy native Steam as first candidate", () => {
    const [first] = mod.getDefaultSavePathCandidates("/home/user");
    expect(first).toMatch(/\.local\/share\/Steam/);
    expect(first).toMatch(/SaveFile_Live\.es3$/);
    expect(first).toMatch(/^\/home\/user/);
  });

  it("sets standard Steam symlink as second candidate", () => {
    const [, second] = mod.getDefaultSavePathCandidates("/home/user");
    expect(second).toMatch(/\.steam\/steam/);
    expect(second).toMatch(/SaveFile_Live\.es3$/);
    expect(second).toMatch(/^\/home\/user/);
  });

  it("sets Flatpak Steam as third candidate", () => {
    const [, , third] = mod.getDefaultSavePathCandidates("/home/user");
    expect(third).toMatch(/\.var\/app\/com\.valvesoftware\.Steam/);
    expect(third).toMatch(/SaveFile_Live\.es3$/);
    expect(third).toMatch(/^\/home\/user/);
  });

  it("uses the provided home prefix", () => {
    const candidates = mod.getDefaultSavePathCandidates("/custom/home");
    for (const c of candidates) {
      expect(c).toMatch(/^\/custom\/home/);
    }
  });

  it("handles empty home gracefully", () => {
    const candidates = mod.getDefaultSavePathCandidates("");
    expect(candidates).toHaveLength(3);
    for (const c of candidates) {
      expect(c).toMatch(/SaveFile_Live\.es3$/);
    }
  });
});

// ---------------------------------------------------------------------------
// getDefaultSavePath — platform-dependent with existsSync fallback
// ---------------------------------------------------------------------------
describe("getDefaultSavePath", () => {
  it("on Windows returns %USERPROFILE% path", async () => {
    mockPlatform.value = "win32";
    vi.resetModules();
    mod = await import("../../src/main/config");

    const result = mod.getDefaultSavePath();
    expect(result).toMatch(/^%USERPROFILE%/);
    expect(result).toMatch(/AppData\/LocalLow\/TesseractStudio\/TaskbarHero\/SaveFile_Live\.es3$/);
  });

  it("on Linux returns first candidate as fallback when Steam is not installed", () => {
    const home = process.env.HOME ?? "/nonexistent";
    const result = mod.getDefaultSavePath();
    const [first] = mod.getDefaultSavePathCandidates(home);
    expect(result).toBe(first);
  });
});

// ---------------------------------------------------------------------------
// resolveConfig
// ---------------------------------------------------------------------------
describe("resolveConfig", () => {
  it("resolves empty savePath via getDefaultSavePath", () => {
    const cfg: AppConfig = {
      savePath: "",
      es3Password: "x",
      pollIntervalSeconds: 5,
      rollingWindowMinutes: 5,
      trackCubeExp: false,
      startTopmost: true,
      logHistoryCsv: false,
      currency: "USD",
    };
    const resolved = mod.resolveConfig(cfg);
    expect(resolved.savePath).toBeTruthy();
    expect(resolved.savePath).not.toBe("");
    expect(typeof resolved.savePath).toBe("string");
  });

  it("preserves non-empty savePath as-is", () => {
    const cfg: AppConfig = {
      savePath: "/custom/save.es3",
      es3Password: "x",
      pollIntervalSeconds: 5,
      rollingWindowMinutes: 5,
      trackCubeExp: false,
      startTopmost: true,
      logHistoryCsv: false,
      currency: "USD",
    };
    const resolved = mod.resolveConfig({ ...cfg });
    expect(resolved.savePath).toBe("/custom/save.es3");
  });

  it("does not mutate the savePath when already set", () => {
    const cfg: AppConfig = {
      savePath: "/keep.es3",
      es3Password: "x",
      pollIntervalSeconds: 5,
      rollingWindowMinutes: 5,
      trackCubeExp: false,
      startTopmost: true,
      logHistoryCsv: false,
      currency: "USD",
    };
    const before = cfg.savePath;
    mod.resolveConfig(cfg);
    expect(cfg.savePath).toBe(before);
  });
});
