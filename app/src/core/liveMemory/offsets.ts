// Pure, version-keyed IL2CPP offset tables for the live memory reader.
// No node / electron / koffi imports — keep this unit-testable.
//
// Derivation method and validation: see _research/live-memory/ (not committed).
// Offsets anchor on REAL class/field names that survive per-build name
// randomization; they must be re-derived per game version.
//
// SHARED SCHEMA (locked, Phase 1): `LiveOffsets` is the single offset-table
// shape used by BOTH the bundled tables here AND the runtime self-healing
// extractor (Phase 3). The extractor must emit exactly this shape — do not let
// the two drift. See STATE.md [D24].

export interface LiveOffsets {
  gameVersion: string;
  /** ScriptMetadata TypeInfo RVA whose slot holds `Il2CppClass*`. */
  typeInfoRva: {
    /** TaskbarHero.CommonSaveData — save-layer anchor for hero/party discovery. */
    commonSaveData: bigint;
    /** Runtime currency-manager static class (obfuscated name; re-found structurally in Phase 3). */
    currencyManager: bigint;
    /** Runtime stage-cache-manager static class. */
    stageCacheManager: bigint;
    /** `np<StageManager>` — battle singleton for the live wave counter. */
    stageManager: bigint;
    /** LocalInventoryManager — real-named class; derive TypeInfo RVA per game version. */
    localInventoryManager: bigint;
    /** `np<LogManager>` — battle-log singleton; source of live chest-drop entries. */
    logManager: bigint;
  };
  player: {
    commonSaveData: number;
    currency: number;
    heroSaveDatas: number;
    petSaveDatas: number;
    /** PlayerSaveData.itemSaveDatas — List<ItemSaveData> (live bag via save snapshot). */
    itemSaveDatas: number;
  };
  common: {
    playTime: number;
    arrangedHeroKey: number;
    maxCompletedStage: number;
    currentStageKey: number;
    currentStageWave: number;
  };
  /** Save-layer HeroSaveData struct offsets (ES3 heap path) — NOT the runtime Hero object. */
  hero: { heroKey: number; level: number; unlock: number; exp: number; equipped: number };
  /** Runtime Hero (a `Unit`) reached from `StageManager.HeroList`. */
  unit: { cache: number };
  /**
   * Runtime hero progression wrapper (`Unit.cache` → HeroRuntime). Level/exp are
   * ACTk Obscured values stored as (hiddenValue, currentCryptoKey) pairs.
   */
  heroRuntime: {
    info: number;
    levelHidden: number;
    levelKey: number;
    expHidden: number;
    expKey: number;
  };
  /** Runtime hero identity block (`HeroRuntime.info` → HeroInfoData). */
  heroInfoData: { heroKey: number };
  /** Save-layer CurrencySaveData — lags the UI; not used for live gold display. */
  currency: { key: number; quantity: number };
  /** PetSaveData struct field offsets (save-layer heap path via CommonSaveData). */
  petSaveData: { petKey: number; isUnlock: number };
  /** ItemSaveData struct field offsets (live bag via PlayerSaveData.itemSaveDatas snapshot). */
  inventoryItem: { itemKey: number; isChaotic: number };
  /** Runtime IL2CPP field offsets (live tick paths). */
  runtime: {
    currency: {
      list: number;
      dict: number;
      entryInfoData: number;
      entryObscuredQty: number;
    };
    stage: {
      currentCache: number;
      cacheInfoData: number;
      stageKey: number;
      waveAmount: number;
      runtimeWave: number;
    };
    currencyInfoKey: number;
    /** StageManager.HeroList field offset (real field name; stable across patches). */
    heroList: number;
    /**
     * Live chest-drop log path. LogManager keeps a `Dictionary<ELogType, List<LogData>>`;
     * the GetBox bucket holds `GetBoxLog` entries whose EMonsterLogType field classifies
     * the drop (0 common, 1 stage boss; 2 act boss is ignored by the companion). Field
     * names are obfuscated but the struct offsets are stable across patches.
     */
    log: {
      /** LogManager.<logByType> — Dictionary<ELogType, List<LogData>>. */
      logByType: number;
      /** ELogType.GetBox dictionary key. */
      getBoxTypeKey: number;
      /** ELogType.StageClear dictionary key. */
      stageClearTypeKey: number;
    };
    /** GetBoxLog struct offsets (obfuscated field names, stable offsets). */
    getBoxLog: {
      /** EMonsterLogType: 0 = common, 1 = stage boss (2 = act boss, not tracked). */
      monsterType: number;
    };
    /**
     * StageClearLog struct offset (real class name, dump.cs-confirmed; obfuscated
     * private field). Live-verified against a real clear on v1.00.23: a run's
     * `+0x40 act, +0x44 stage, +0x48 clearTimeSec (int), +0x4c isBoss` layout — we
     * only need clearTimeSec (stage attribution uses the already-live stageKey).
     */
    stageClearLog: {
      /** Clear time in whole seconds, as recorded by the game itself. */
      clearTimeSec: number;
    };
  };
  /** Standard IL2CPP container / dictionary layout. */
  container: { objectHeader: number; listItems: number; listSize: number; arrayFirst: number };
  dict: {
    entries: number;
    count: number;
    entrySize: number;
    entryHash: number;
    /** Inline int32 key (`Dictionary<int, T>` — not boxed). */
    entryKey: number;
    entryValue: number;
  };
  il2cppClass: { staticFieldsOffsets: readonly number[] };
  goldKey: number;
}

const RUNTIME_V1_00_21 = {
  currency: { list: 0x0, dict: 0x8, entryInfoData: 0x10, entryObscuredQty: 0x28 },
  stage: {
    currentCache: 0x88,
    cacheInfoData: 0x10,
    stageKey: 0x30,
    waveAmount: 0x54,
    runtimeWave: 0x138,
  },
  currencyInfoKey: 0x30,
  heroList: 0x30, // StageManager.HeroList — real field name, stable across patches
  log: {
    logByType: 0x28, // LogManager Dictionary<ELogType, List<LogData>>
    getBoxTypeKey: 3, // ELogType.GetBox
    stageClearTypeKey: 1, // ELogType.StageClear
  },
  getBoxLog: {
    monsterType: 0x50, // GetBoxLog EMonsterLogType (0 common, 1 stage boss; 2 act boss ignored)
  },
  stageClearLog: {
    clearTimeSec: 0x48, // StageClearLog — live-verified on v1.00.23 (see phase-4-stage-times/design.md)
  },
} as const;

const CONTAINER = { objectHeader: 0x10, listItems: 0x10, listSize: 0x18, arrayFirst: 0x20 };
const DICT = {
  entries: 0x18,
  count: 0x20,
  entrySize: 24,
  entryHash: 0,
  entryKey: 8,
  entryValue: 16,
};
const IL2CPP_CLASS = { staticFieldsOffsets: [0xb0, 0xb8, 0xa8] as const };

const V1_00_23: LiveOffsets = {
  gameVersion: "1.00.23",
  typeInfoRva: {
    // Il2CppDumper script.json — vb.tp / vb.uu replaced uz.tm / uz.us; singletons use nq<T>.
    commonSaveData: 0x5de0d08n,
    currencyManager: 0x5db9758n, // vb.tp static List<vb.tq> + Dictionary<int, vb.tq>
    stageCacheManager: 0x5dba2f8n, // vb.uu static StageCache at +0x88
    stageManager: 0x5e30318n, // nq<StageManager>
    localInventoryManager: 0n,
    logManager: 0x5e2fb58n, // nq<LogManager>
  },
  player: {
    commonSaveData: 0x10,
    currency: 0x48,
    heroSaveDatas: 0x50,
    petSaveDatas: 0x70, // PlayerSaveData.PetSaveData (was 0x68 in v1.00.21)
    itemSaveDatas: 0xa8, // PlayerSaveData.itemSaveDatas (was 0xa0 in v1.00.21)
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
  heroRuntime: {
    info: 0x30,
    levelHidden: 0xd0,
    levelKey: 0xd4,
    expHidden: 0x110,
    expKey: 0x114,
  },
  heroInfoData: { heroKey: 0x30 },
  currency: { key: 0x10, quantity: 0x18 },
  petSaveData: { petKey: 0x10, isUnlock: 0x14 },
  inventoryItem: { itemKey: 0x10, isChaotic: 0x20 },
  runtime: RUNTIME_V1_00_21,
  container: CONTAINER,
  dict: DICT,
  il2cppClass: IL2CPP_CLASS,
  goldKey: 100001,
};

const V1_00_21: LiveOffsets = {
  gameVersion: "1.00.21",
  typeInfoRva: {
    commonSaveData: 0x5df05f8n,
    currencyManager: 0x5dc8db8n, // uz.tm
    stageCacheManager: 0x5dc9958n, // uz.us
    stageManager: 0x5e3ff98n, // np<StageManager>
    localInventoryManager: 0n, // unused since inventory reads via PlayerSaveData.itemSaveDatas
    logManager: 0n, // SPEC_DEVIATION: TypeInfo RVA derived at runtime by the extractor
  },
  player: {
    commonSaveData: 0x10,
    currency: 0x48,
    heroSaveDatas: 0x50,
    petSaveDatas: 0x68, // PlayerSaveData.PetSaveData (List<PetSaveData>)
    itemSaveDatas: 0xa0, // PlayerSaveData.itemSaveDatas (List<ItemSaveData>)
  },
  common: {
    playTime: 0x20,
    arrangedHeroKey: 0x48,
    maxCompletedStage: 0x54,
    currentStageKey: 0x58,
    currentStageWave: 0x5c,
  },
  hero: { heroKey: 0x10, level: 0x14, unlock: 0x18, exp: 0x1c, equipped: 0x28 },
  unit: { cache: 0x3a8 }, // Unit.cache → HeroRuntime (stable real field)
  heroRuntime: {
    info: 0x30, // → HeroInfoData
    levelHidden: 0xd0, // ObscuredInt level: hiddenValue
    levelKey: 0xd4, //    currentCryptoKey
    expHidden: 0x110, // ObscuredFloat xp: hiddenValue
    expKey: 0x114, //    currentCryptoKey
  },
  heroInfoData: { heroKey: 0x30 },
  currency: { key: 0x10, quantity: 0x18 },
  petSaveData: {
    petKey: 0x10, // PetSaveData.PetKey
    isUnlock: 0x14, // PetSaveData.IsUnlock
  },
  inventoryItem: {
    itemKey: 0x10, // ItemSaveData.ItemKey
    isChaotic: 0x20, // ItemSaveData.IsChaotic
  },
  runtime: RUNTIME_V1_00_21,
  container: CONTAINER,
  dict: DICT,
  il2cppClass: IL2CPP_CLASS,
  goldKey: 100001,
};

const TABLE: Record<string, LiveOffsets> = {
  "1.00.21": V1_00_21,
  "1.00.23": V1_00_23,
};

/** Returns the offset table for a detected game version, or null (degraded mode). */
export function offsetsForVersion(version: string | null | undefined): LiveOffsets | null {
  if (!version) return null;
  return TABLE[version] ?? null;
}

export function supportedVersions(): string[] {
  return Object.keys(TABLE);
}

// --- pure plausibility helpers (used by the reader + tests) ---

export function plausiblePlayTime(v: number | null): boolean {
  return v != null && v > 100 && v < 1e9;
}

export function plausibleStage(v: number | null): boolean {
  return v != null && v > 0 && v < 1_000_000;
}

export function plausibleGold(v: number | null): boolean {
  return v != null && v >= 0 && v < 1e15;
}

export function plausibleWave(v: number | null): boolean {
  return v != null && v > 0 && v < 1000;
}
