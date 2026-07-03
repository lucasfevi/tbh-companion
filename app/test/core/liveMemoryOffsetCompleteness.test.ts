import { describe, it, expect } from "vitest";
import {
  missingOffsetFields,
  hasCriticalOffsets,
  isOffsetTableComplete,
  mergeOffsets,
} from "../../src/core/liveMemory/offsetCompleteness";
import { offsetsForVersion, type LiveOffsets } from "../../src/core/liveMemory/offsets";

const BASE = offsetsForVersion("1.00.21")!; // complete-critical, missing logManager RVA

function withLogManager(o: LiveOffsets, rva: bigint): LiveOffsets {
  return { ...o, typeInfoRva: { ...o.typeInfoRva, logManager: rva } };
}

describe("missingOffsetFields", () => {
  it("reports logManager as the only gap in the bundled v1.00.21 table", () => {
    expect(missingOffsetFields(BASE, "full")).toEqual(["typeInfoRva.logManager"]);
  });

  it("reports no gaps at the critical level for the bundled table", () => {
    expect(missingOffsetFields(BASE, "critical")).toEqual([]);
  });

  it("reports a zeroed critical field", () => {
    const broken = { ...BASE, typeInfoRva: { ...BASE.typeInfoRva, stageManager: 0n } };
    expect(missingOffsetFields(broken, "critical")).toContain("typeInfoRva.stageManager");
  });

  it("reports every wanted enrichment gap when they are all zero", () => {
    const stripped: LiveOffsets = {
      ...BASE,
      typeInfoRva: { ...BASE.typeInfoRva, logManager: 0n, commonSaveData: 0n },
      player: { ...BASE.player, petSaveDatas: 0, itemSaveDatas: 0 },
      petSaveData: { petKey: 0, isUnlock: 0 },
      inventoryItem: { itemKey: 0, isChaotic: 0 },
      runtime: {
        ...BASE.runtime,
        log: { ...BASE.runtime.log, stageClearTypeKey: 0 },
        stageClearLog: { clearTimeSec: 0 },
      },
    };
    expect(missingOffsetFields(stripped, "full").sort()).toEqual(
      [
        "inventoryItem.isChaotic",
        "inventoryItem.itemKey",
        "petSaveData.isUnlock",
        "petSaveData.petKey",
        "player.itemSaveDatas",
        "player.petSaveDatas",
        "runtime.log.stageClearTypeKey",
        "runtime.stageClearLog.clearTimeSec",
        "typeInfoRva.commonSaveData",
        "typeInfoRva.logManager",
      ].sort(),
    );
  });

  it("treats commonSaveData as enrichment, not critical (pets/inventory anchor only)", () => {
    const noCsd = { ...BASE, typeInfoRva: { ...BASE.typeInfoRva, commonSaveData: 0n } };
    expect(missingOffsetFields(noCsd, "critical")).toEqual([]);
    expect(missingOffsetFields(noCsd, "full")).toContain("typeInfoRva.commonSaveData");
  });
});

describe("hasCriticalOffsets / isOffsetTableComplete", () => {
  it("bundled table has critical offsets but is not fully complete", () => {
    expect(hasCriticalOffsets(BASE)).toBe(true);
    expect(isOffsetTableComplete(BASE)).toBe(false);
  });

  it("filling logManager makes the table complete", () => {
    const complete = withLogManager(BASE, 0x5e40000n);
    expect(isOffsetTableComplete(complete)).toBe(true);
  });

  it("a zeroed critical field fails hasCriticalOffsets", () => {
    const broken = { ...BASE, runtime: { ...BASE.runtime, heroList: 0 } };
    expect(hasCriticalOffsets(broken)).toBe(false);
  });
});

describe("mergeOffsets", () => {
  it("fills a missing base field from the derived table", () => {
    const derived = withLogManager(BASE, 0x5e40000n);
    const merged = mergeOffsets(BASE, derived);
    expect(merged.typeInfoRva.logManager).toBe(0x5e40000n);
    expect(isOffsetTableComplete(merged)).toBe(true);
  });

  it("keeps the base value when both are present (fills only gaps)", () => {
    const derived: LiveOffsets = {
      ...BASE,
      runtime: { ...BASE.runtime, heroList: 0x999 },
      typeInfoRva: { ...BASE.typeInfoRva, logManager: 0x5e40000n },
    };
    const merged = mergeOffsets(BASE, derived);
    expect(merged.runtime.heroList).toBe(BASE.runtime.heroList); // base wins
    expect(merged.typeInfoRva.logManager).toBe(0x5e40000n); // gap filled
  });

  it("fills zeroed pet/inventory struct offsets from the derived table", () => {
    const stripped: LiveOffsets = {
      ...BASE,
      petSaveData: { petKey: 0, isUnlock: 0 },
      inventoryItem: { itemKey: 0, isChaotic: 0 },
      player: { ...BASE.player, petSaveDatas: 0, itemSaveDatas: 0 },
    };
    const derived = withLogManager(BASE, 0x5e40000n);
    const merged = mergeOffsets(stripped, derived);
    expect(merged.petSaveData.petKey).toBe(BASE.petSaveData.petKey);
    expect(merged.inventoryItem.itemKey).toBe(BASE.inventoryItem.itemKey);
    expect(merged.player.itemSaveDatas).toBe(BASE.player.itemSaveDatas);
  });

  it("fills zeroed stage-clear log offsets from the derived table", () => {
    const stripped: LiveOffsets = {
      ...BASE,
      runtime: {
        ...BASE.runtime,
        log: { ...BASE.runtime.log, stageClearTypeKey: 0 },
        stageClearLog: { clearTimeSec: 0 },
      },
    };
    const derived = withLogManager(BASE, 0x5e40000n);
    const merged = mergeOffsets(stripped, derived);
    expect(merged.runtime.log.stageClearTypeKey).toBe(BASE.runtime.log.stageClearTypeKey);
    expect(merged.runtime.stageClearLog.clearTimeSec).toBe(BASE.runtime.stageClearLog.clearTimeSec);
    expect(isOffsetTableComplete(merged)).toBe(true);
  });
});
