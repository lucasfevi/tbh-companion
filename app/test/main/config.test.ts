import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AppConfig } from "../../src/main/config";

// -- platform mock helpers --
const mockPlatform = vi.hoisted(() => ({ value: "linux" }));
vi.mock("node:os", () => ({
  platform: () => mockPlatform.value,
}));

// Dynamic import so node:os mock is established before the module evaluates.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type ConfigModule = typeof import("../../src/main/config");
let mod: ConfigModule;

beforeEach(async () => {
  vi.resetModules();
  mockPlatform.value = "linux";
  mod = await import("../../src/main/config");
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
