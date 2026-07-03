// Pure completeness validation + merge for LiveOffsets tables.
// Drives the self-healing resolver: a table missing any WANTED field triggers
// runtime extraction, and derived values are merged into the base table.
// No node / electron imports — unit-testable.

import type { LiveOffsets } from "./offsets";

interface FieldCheck {
  /** Dotted path, e.g. "typeInfoRva.logManager" — used for diagnostics + tests. */
  path: string;
  get: (o: LiveOffsets) => number | bigint;
}

/**
 * Fields the live reader cannot function without. A zero here means core stats
 * (stage, gold, heroes) are unavailable → the reader degrades to save-only.
 * These are never legitimately zero when correctly derived.
 */
const CRITICAL_FIELDS: readonly FieldCheck[] = [
  { path: "typeInfoRva.currencyManager", get: (o) => o.typeInfoRva.currencyManager },
  { path: "typeInfoRva.stageCacheManager", get: (o) => o.typeInfoRva.stageCacheManager },
  { path: "typeInfoRva.stageManager", get: (o) => o.typeInfoRva.stageManager },
  { path: "runtime.heroList", get: (o) => o.runtime.heroList },
];

/**
 * Enrichment fields — live chest drops, pets, inventory. A zero here disables
 * that one feature (the reader still works), but we still want them all mapped,
 * so their absence triggers the extractor. None are legitimately zero.
 * `commonSaveData` lives here (not critical): it only anchors the pets and
 * inventory save-snapshot walks, and no static root for it was reachable on
 * v1.00.23 — core stats must not be held hostage to it.
 */
const ENRICHMENT_FIELDS: readonly FieldCheck[] = [
  { path: "typeInfoRva.commonSaveData", get: (o) => o.typeInfoRva.commonSaveData },
  { path: "typeInfoRva.logManager", get: (o) => o.typeInfoRva.logManager },
  { path: "player.petSaveDatas", get: (o) => o.player.petSaveDatas },
  { path: "player.itemSaveDatas", get: (o) => o.player.itemSaveDatas },
  { path: "petSaveData.petKey", get: (o) => o.petSaveData.petKey },
  { path: "petSaveData.isUnlock", get: (o) => o.petSaveData.isUnlock },
  { path: "inventoryItem.itemKey", get: (o) => o.inventoryItem.itemKey },
  { path: "inventoryItem.isChaotic", get: (o) => o.inventoryItem.isChaotic },
  { path: "runtime.log.stageClearTypeKey", get: (o) => o.runtime.log.stageClearTypeKey },
  { path: "runtime.stageClearLog.clearTimeSec", get: (o) => o.runtime.stageClearLog.clearTimeSec },
];

const ALL_FIELDS: readonly FieldCheck[] = [...CRITICAL_FIELDS, ...ENRICHMENT_FIELDS];

function isPresent(v: number | bigint): boolean {
  return typeof v === "bigint" ? v !== 0n : v !== 0;
}

export type CompletenessLevel = "critical" | "full";

/**
 * List the dotted paths of required fields that are still zero/undefined.
 * `level` "critical" checks only the reader-blocking fields; "full" (default)
 * checks every wanted field.
 */
export function missingOffsetFields(o: LiveOffsets, level: CompletenessLevel = "full"): string[] {
  const fields = level === "critical" ? CRITICAL_FIELDS : ALL_FIELDS;
  return fields.filter((f) => !isPresent(f.get(o))).map((f) => f.path);
}

/** True when every reader-blocking (critical) field is present. Gates `supported`. */
export function hasCriticalOffsets(o: LiveOffsets): boolean {
  return missingOffsetFields(o, "critical").length === 0;
}

/** True when every wanted field is present. When false, the extractor should run. */
export function isOffsetTableComplete(o: LiveOffsets): boolean {
  return missingOffsetFields(o, "full").length === 0;
}

function pickN(base: number, derived: number): number {
  return base !== 0 ? base : derived;
}
function pickB(base: bigint, derived: bigint): bigint {
  return base !== 0n ? base : derived;
}

/**
 * Fill the base table's missing (zero) fields from the derived table, keeping
 * every already-present base value. Structural constants stay from `base`.
 * Same-version merge: base values are trusted; the extractor only fills gaps.
 */
export function mergeOffsets(base: LiveOffsets, derived: LiveOffsets): LiveOffsets {
  return {
    ...base,
    typeInfoRva: {
      ...base.typeInfoRva,
      commonSaveData: pickB(base.typeInfoRva.commonSaveData, derived.typeInfoRva.commonSaveData),
      currencyManager: pickB(base.typeInfoRva.currencyManager, derived.typeInfoRva.currencyManager),
      stageCacheManager: pickB(
        base.typeInfoRva.stageCacheManager,
        derived.typeInfoRva.stageCacheManager,
      ),
      stageManager: pickB(base.typeInfoRva.stageManager, derived.typeInfoRva.stageManager),
      logManager: pickB(base.typeInfoRva.logManager, derived.typeInfoRva.logManager),
    },
    player: {
      ...base.player,
      petSaveDatas: pickN(base.player.petSaveDatas, derived.player.petSaveDatas),
      itemSaveDatas: pickN(base.player.itemSaveDatas, derived.player.itemSaveDatas),
    },
    petSaveData: {
      petKey: pickN(base.petSaveData.petKey, derived.petSaveData.petKey),
      isUnlock: pickN(base.petSaveData.isUnlock, derived.petSaveData.isUnlock),
    },
    inventoryItem: {
      itemKey: pickN(base.inventoryItem.itemKey, derived.inventoryItem.itemKey),
      isChaotic: pickN(base.inventoryItem.isChaotic, derived.inventoryItem.isChaotic),
    },
    runtime: {
      ...base.runtime,
      heroList: pickN(base.runtime.heroList, derived.runtime.heroList),
      log: {
        ...base.runtime.log,
        logByType: pickN(base.runtime.log.logByType, derived.runtime.log.logByType),
        getBoxTypeKey: pickN(base.runtime.log.getBoxTypeKey, derived.runtime.log.getBoxTypeKey),
        stageClearTypeKey: pickN(
          base.runtime.log.stageClearTypeKey,
          derived.runtime.log.stageClearTypeKey,
        ),
      },
      getBoxLog: {
        ...base.runtime.getBoxLog,
        monsterType: pickN(
          base.runtime.getBoxLog.monsterType,
          derived.runtime.getBoxLog.monsterType,
        ),
      },
      stageClearLog: {
        ...base.runtime.stageClearLog,
        clearTimeSec: pickN(
          base.runtime.stageClearLog.clearTimeSec,
          derived.runtime.stageClearLog.clearTimeSec,
        ),
      },
    },
  };
}
