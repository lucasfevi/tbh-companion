import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  offsetCachePath,
  loadCachedOffsets,
  saveCachedOffsets,
} from "../../src/main/liveMemory/offsetCache";
import type { LiveOffsets } from "../../src/core/liveMemory/offsets";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TEST_DIR = join(
  process.env["TEMP"] ?? process.env["TMP"] ?? "/tmp",
  `tbh-offset-cache-test-${process.pid}`,
);

const VERSION = "1.99.00";

// Minimal valid LiveOffsets for round-trip testing.
function makeOffsets(version = VERSION): LiveOffsets {
  return {
    gameVersion: version,
    typeInfoRva: {
      commonSaveData: 0x5df05f8n,
      currencyManager: 0x5dc8db8n,
      stageCacheManager: 0x5dc9958n,
      stageManager: 0x5e3ff98n,
      localInventoryManager: 0x1234000n,
      logManager: 0x5e40000n,
    },
    player: {
      commonSaveData: 0x10,
      currency: 0x48,
      heroSaveDatas: 0x50,
      petSaveDatas: 0x68,
      itemSaveDatas: 0xa0,
    },
    common: {
      playTime: 0x20,
      arrangedHeroKey: 0x48,
      maxCompletedStage: 0x54,
      currentStageKey: 0x58,
      currentStageWave: 0x5c,
    },
    hero: { heroKey: 0x10, level: 0x14, unlock: 0x18, exp: 0x1c, equipped: 0x28 },
    unit: { cache: 0x3a8 },
    heroRuntime: { info: 0x30, levelHidden: 0xd0, levelKey: 0xd4, expHidden: 0x110, expKey: 0x114 },
    heroInfoData: { heroKey: 0x30 },
    currency: { key: 0x10, quantity: 0x18 },
    petSaveData: { petKey: 0x10, isUnlock: 0x14 },
    inventoryItem: { itemKey: 0x10, isChaotic: 0x20 },
    runtime: {
      currency: { list: 0x0, dict: 0x8, entryInfoData: 0x10, entryObscuredQty: 0x28 },
      stage: {
        currentCache: 0x88,
        cacheInfoData: 0x10,
        stageKey: 0x30,
        waveAmount: 0x54,
        runtimeWave: 0x138,
      },
      currencyInfoKey: 0x30,
      heroList: 0x30,
      log: { logByType: 0x28, getBoxTypeKey: 3 },
      getBoxLog: { monsterType: 0x50 },
    },
    container: { objectHeader: 0x10, listItems: 0x10, listSize: 0x18, arrayFirst: 0x20 },
    dict: { entries: 0x18, count: 0x20, entrySize: 24, entryHash: 0, entryKey: 8, entryValue: 16 },
    il2cppClass: { staticFieldsOffsets: [0xb0, 0xb8, 0xa8] as const },
    goldKey: 100001,
  };
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  try {
    rmSync(TEST_DIR, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

// ── offsetCachePath ───────────────────────────────────────────────────────────

describe("offsetCachePath", () => {
  it("returns the cache file name under the given cache directory", () => {
    const result = offsetCachePath(TEST_DIR, "1.99.00");
    expect(result).toBe(join(TEST_DIR, "tbh-companion-offsets-v1.99.00.json"));
  });
});

// ── loadCachedOffsets ─────────────────────────────────────────────────────────

describe("loadCachedOffsets", () => {
  it("returns null when the file does not exist", () => {
    expect(loadCachedOffsets(TEST_DIR, VERSION)).toBeNull();
  });

  it("returns null when the JSON is corrupt", () => {
    writeFileSync(offsetCachePath(TEST_DIR, VERSION), "not-json");
    expect(loadCachedOffsets(TEST_DIR, VERSION)).toBeNull();
  });

  it("returns null when gameVersion in file does not match requested version", () => {
    saveCachedOffsets(TEST_DIR, makeOffsets("1.00.21")); // wrote for 1.00.21
    expect(loadCachedOffsets(TEST_DIR, VERSION)).toBeNull(); // requesting 1.99.00
  });

  it("returns the offsets when the file is valid and version matches", () => {
    const offsets = makeOffsets();
    saveCachedOffsets(TEST_DIR, offsets);
    const loaded = loadCachedOffsets(TEST_DIR, VERSION);
    expect(loaded).not.toBeNull();
    expect(loaded!.gameVersion).toBe(VERSION);
  });
});

// ── saveCachedOffsets ─────────────────────────────────────────────────────────

describe("saveCachedOffsets", () => {
  it("writes a JSON file that can be re-loaded with the correct values", () => {
    const offsets = makeOffsets();
    saveCachedOffsets(TEST_DIR, offsets);
    expect(existsSync(offsetCachePath(TEST_DIR, VERSION))).toBe(true);
    const loaded = loadCachedOffsets(TEST_DIR, VERSION);
    expect(loaded).not.toBeNull();
    expect(loaded!.goldKey).toBe(offsets.goldKey);
    expect(loaded!.runtime.heroList).toBe(offsets.runtime.heroList);
  });

  it("round-trips bigint typeInfoRva values correctly", () => {
    const offsets = makeOffsets();
    saveCachedOffsets(TEST_DIR, offsets);
    const loaded = loadCachedOffsets(TEST_DIR, VERSION);
    expect(loaded!.typeInfoRva.stageManager).toBe(offsets.typeInfoRva.stageManager);
    expect(loaded!.typeInfoRva.localInventoryManager).toBe(
      offsets.typeInfoRva.localInventoryManager,
    );
  });

  it("does not throw when the directory is not writable (swallows error)", () => {
    expect(() => saveCachedOffsets("/nonexistent/path/xyz", makeOffsets())).not.toThrow();
  });
});
