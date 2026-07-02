import { describe, it, expect } from "vitest";
import { join } from "node:path";
import {
  hashInstallPath,
  LIVE_MEMORY_OFFSET_CACHE_DIR,
  LIVE_MEMORY_USER_DATA_ENV,
  normalizeInstallPath,
  resolveLiveMemoryOffsetCacheDir,
  resolveLiveMemoryUserDataDir,
} from "../../src/main/liveMemory/liveMemoryCacheDir";

describe("normalizeInstallPath", () => {
  it("lowercases and normalizes Windows separators", () => {
    expect(normalizeInstallPath("C:\\Steam\\TaskBarHero")).toBe("c:/steam/taskbarhero");
  });

  it("strips trailing slashes", () => {
    expect(normalizeInstallPath("D:/Games/TBH/")).toBe("d:/games/tbh");
  });
});

describe("hashInstallPath", () => {
  it("is stable for the same install folder", () => {
    expect(hashInstallPath("C:\\Steam\\TaskBarHero")).toBe(hashInstallPath("c:/steam/taskbarhero"));
  });

  it("differs for different install folders", () => {
    expect(hashInstallPath("C:\\Steam\\TaskBarHero")).not.toBe(
      hashInstallPath("D:\\Steam\\TaskBarHero"),
    );
  });
});

describe("resolveLiveMemoryOffsetCacheDir", () => {
  it("stores caches under userData keyed by install-path hash", () => {
    const installDir = "C:\\Steam\\steamapps\\common\\TaskBarHero";
    const userDataDir = "C:\\Users\\me\\AppData\\Roaming\\tbh-companion";
    const result = resolveLiveMemoryOffsetCacheDir(userDataDir, installDir);
    expect(result).toBe(
      join(userDataDir, LIVE_MEMORY_OFFSET_CACHE_DIR, hashInstallPath(installDir)),
    );
    expect(result).not.toContain("TaskBarHero");
  });
});

describe("resolveLiveMemoryUserDataDir", () => {
  it("returns TBH_USER_DATA when set", () => {
    const previous = process.env[LIVE_MEMORY_USER_DATA_ENV];
    process.env[LIVE_MEMORY_USER_DATA_ENV] = "C:\\fake\\userData";
    try {
      expect(resolveLiveMemoryUserDataDir()).toBe("C:\\fake\\userData");
    } finally {
      if (previous === undefined) delete process.env[LIVE_MEMORY_USER_DATA_ENV];
      else process.env[LIVE_MEMORY_USER_DATA_ENV] = previous;
    }
  });

  it("uses a temp test directory under Vitest", () => {
    expect(resolveLiveMemoryUserDataDir()).toContain("tbh-live-memory-test-userdata");
  });
});
