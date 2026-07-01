import { describe, it, expect } from "vitest";
import {
  offsetsForVersion,
  supportedVersions,
  plausiblePlayTime,
  plausibleStage,
  plausibleGold,
  plausibleWave,
} from "../../src/core/liveMemory/offsets";

describe("offsetsForVersion", () => {
  it("returns the bundled table for an exact version match (fast path — LMR-06)", () => {
    const o = offsetsForVersion("1.00.21");
    expect(o).not.toBeNull();
    expect(o?.gameVersion).toBe("1.00.21");
    // spot-check a couple of locked schema values so an accidental edit is caught
    expect(o?.goldKey).toBe(100001);
    expect(o?.runtime.stage.stageKey).toBe(0x30);
    expect(o?.typeInfoRva.stageCacheManager).toBe(0x5dc9958n);
  });

  it("returns null for an unknown/absent version (degraded mode — LMR-07)", () => {
    expect(offsetsForVersion("1.00.99")).toBeNull();
    expect(offsetsForVersion(null)).toBeNull();
    expect(offsetsForVersion(undefined)).toBeNull();
    expect(offsetsForVersion("")).toBeNull();
  });

  it("lists the supported versions", () => {
    expect(supportedVersions()).toContain("1.00.21");
  });

  it("exposes the complete shared schema shape (locked for Phase 3)", () => {
    const o = offsetsForVersion("1.00.21")!;
    expect(Object.keys(o.typeInfoRva).sort()).toEqual([
      "commonSaveData",
      "currencyManager",
      "localInventoryManager",
      "stageCacheManager",
      "stageManager",
    ]);
    expect(o.runtime.currency.entryObscuredQty).toBe(0x28);
    expect(o.dict.entryKey).toBe(8); // inline int32 key trap (not boxed)
    // Phase 2 schema additions
    expect(o.runtime.heroList).toBe(0x30); // StageManager.HeroList — real field
    expect("boxCount" in o.runtime.stage).toBe(true);
    expect("petSaveData" in o).toBe(true);
    expect("inventoryItem" in o).toBe(true);
    expect("petSaveDatas" in o.player).toBe(true);
  });
});

describe("plausibility guards", () => {
  it("plausiblePlayTime accepts sane play times, rejects garbage/null", () => {
    expect(plausiblePlayTime(3600)).toBe(true);
    expect(plausiblePlayTime(100)).toBe(false); // exclusive lower bound
    expect(plausiblePlayTime(1e9)).toBe(false); // exclusive upper bound
    expect(plausiblePlayTime(null)).toBe(false);
  });

  it("plausibleStage accepts positive stage keys within range", () => {
    expect(plausibleStage(1)).toBe(true);
    expect(plausibleStage(999_999)).toBe(true);
    expect(plausibleStage(0)).toBe(false);
    expect(plausibleStage(1_000_000)).toBe(false);
    expect(plausibleStage(null)).toBe(false);
  });

  it("plausibleGold accepts non-negative values below the safe ceiling", () => {
    expect(plausibleGold(0)).toBe(true);
    expect(plausibleGold(123456)).toBe(true);
    expect(plausibleGold(-1)).toBe(false);
    expect(plausibleGold(1e15)).toBe(false);
    expect(plausibleGold(null)).toBe(false);
  });

  it("plausibleWave accepts a positive wave under 1000", () => {
    expect(plausibleWave(1)).toBe(true);
    expect(plausibleWave(999)).toBe(true);
    expect(plausibleWave(0)).toBe(false);
    expect(plausibleWave(1000)).toBe(false);
    expect(plausibleWave(null)).toBe(false);
  });
});
