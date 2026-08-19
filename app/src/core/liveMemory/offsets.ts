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
  };
  player: { commonSaveData: number; currency: number; heroSaveDatas: number };
  common: {
    playTime: number;
    arrangedHeroKey: number;
    maxCompletedStage: number;
    currentStageKey: number;
    currentStageWave: number;
  };
  hero: { heroKey: number; level: number; unlock: number; exp: number; equipped: number };
  /** Save-layer CurrencySaveData — lags the UI; not used for live gold display. */
  currency: { key: number; quantity: number };
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

const V1_00_21: LiveOffsets = {
  gameVersion: "1.00.21",
  typeInfoRva: {
    commonSaveData: 0x5df05f8n,
    currencyManager: 0x5dc8db8n,
    stageCacheManager: 0x5dc9958n,
    stageManager: 0x5e3ff98n,
  },
  player: { commonSaveData: 0x10, currency: 0x48, heroSaveDatas: 0x50 },
  common: {
    playTime: 0x20,
    arrangedHeroKey: 0x48,
    maxCompletedStage: 0x54,
    currentStageKey: 0x58,
    currentStageWave: 0x5c,
  },
  hero: { heroKey: 0x10, level: 0x14, unlock: 0x18, exp: 0x1c, equipped: 0x28 },
  currency: { key: 0x10, quantity: 0x18 },
  runtime: RUNTIME_V1_00_21,
  container: CONTAINER,
  dict: DICT,
  il2cppClass: IL2CPP_CLASS,
  goldKey: 100001,
};

const TABLE: Record<string, LiveOffsets> = {
  "1.00.21": V1_00_21,
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
