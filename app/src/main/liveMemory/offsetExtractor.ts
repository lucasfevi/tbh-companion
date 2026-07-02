// Runtime IL2CPP offset derivation for unknown game versions.
// Runs in the utilityProcess worker only. Impure: uses WinProcess for memory reads.
// On failure at any critical anchor, returns null (degraded mode — never wrong reads).

import {
  readCString,
  readClassFields,
  resolveStructuralCurrencyManager,
} from "../../core/liveMemory/il2cppScanner";
import { readPtr } from "../../core/liveMemory/memory";
import type { LiveOffsets } from "../../core/liveMemory/offsets";
import type { WinProcess } from "./winProcess";

// ── Constants ────────────────────────────────────────────────────────────────

const IL2CPP_CLASS_NAME_OFFSET = 0x10n;
const STATIC_FIELDS_CANDIDATES = [0xb0, 0xb8, 0xa8] as const;

// Anchor classes with real (serialization-stable) names. Their TypeInfo slots and
// public field names survive per-build obfuscation, so name-based scanning works.
const ANCHOR_NAMES = [
  "StageManager",
  "CommonSaveData",
  "StageCacheManager",
  "LogManager",
  "PlayerSaveData",
  "PetSaveData",
  "ItemSaveData",
] as const;

// Structural offsets whose field names ARE obfuscated but whose byte offsets are
// stable across patches (log dict, GetBoxLog type, runtime wave). Emitted as
// constants rather than derived by name.
const STRUCT_LOG_BY_TYPE = 0x28;
const STRUCT_GETBOX_TYPE = 0x50;
const STRUCT_GETBOX_KEY = 3; // ELogType.GetBox
const STRUCT_RUNTIME_WAVE = 0x138;

// ── Internal: DLL region scan ─────────────────────────────────────────────────

interface ClassCandidate {
  slotRva: bigint;
  classPtr: bigint;
}

/**
 * Single-pass scan of all DLL-range readable regions.
 * Collects named-target matches + ALL valid class candidates (for structural detection).
 * Early-exits named scan when all target names found, but continues collecting candidates.
 */
function scanDll(
  proc: WinProcess,
  gaBase: bigint,
  gaSize: number,
  targetNames: ReadonlySet<string>,
): {
  named: Map<string, ClassCandidate>;
  allCandidates: ClassCandidate[];
} {
  const named = new Map<string, ClassCandidate>();
  const allCandidates: ClassCandidate[] = [];

  const gaEnd = gaBase + BigInt(gaSize);

  for (const region of proc.readableRegions()) {
    if (region.baseAddress < gaBase || region.baseAddress >= gaEnd) continue;
    if (region.size < 8) continue;

    const regionEnd = region.baseAddress + BigInt(region.size);
    for (let slot = region.baseAddress; slot + 8n <= regionEnd; slot += 8n) {
      const classPtr = readPtr(proc, slot);
      if (classPtr == null || classPtr <= 0x10000n || classPtr > 0x7ff0_0000_0000n) continue;

      // Read the class name pointer at classPtr+0x10.
      const namePtr = readPtr(proc, classPtr + IL2CPP_CLASS_NAME_OFFSET);
      if (namePtr == null || namePtr <= 0x10000n) continue;

      const candidate: ClassCandidate = { slotRva: slot - gaBase, classPtr };
      allCandidates.push(candidate);

      // Check if it's a named target we haven't found yet.
      if (named.size < targetNames.size) {
        const name = readCString(proc, namePtr);
        if (name && targetNames.has(name) && !named.has(name)) {
          named.set(name, candidate);
        }
      }
    }
  }

  return { named, allCandidates };
}

// ── Field lookup helpers ──────────────────────────────────────────────────────

function pickField(fields: Map<string, number> | null, candidates: string[]): number {
  if (!fields) return 0;
  for (const c of candidates) {
    const v = fields.get(c);
    if (v != null && v > 0) return v;
  }
  return 0;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Attempt runtime offset derivation from GameAssembly.dll memory.
 * Returns a complete `LiveOffsets` table or null on any critical-anchor failure.
 *
 * Critical anchors (must all be found): `np<StageManager>`, `CommonSaveData`, currency-manager.
 * Non-critical anchors (zero-value fallback): `LocalInventoryManager`, `StageCacheManager`.
 */
export function extractOffsets(
  proc: WinProcess,
  ga: { base: bigint; size: number },
  version: string,
): LiveOffsets | null {
  const { named, allCandidates } = scanDll(proc, ga.base, ga.size, new Set(ANCHOR_NAMES));

  // ── Critical anchors ───────────────────────────────────────────────────────
  const smEntry = named.get("StageManager");
  const csdEntry = named.get("CommonSaveData");
  if (!smEntry || !csdEntry) return null;

  // Currency manager: structural identification among all candidates.
  const cmRva = resolveStructuralCurrencyManager(
    proc,
    ga.base,
    allCandidates,
    STATIC_FIELDS_CANDIDATES,
  );
  if (!cmRva) return null;

  // ── Non-critical anchors ───────────────────────────────────────────────────
  const scmEntry = named.get("StageCacheManager");
  const logEntry = named.get("LogManager");
  const psdEntry = named.get("PlayerSaveData");
  const petEntry = named.get("PetSaveData");
  const itemEntry = named.get("ItemSaveData");

  // ── Field maps (real names on serializable classes) ────────────────────────
  const heroListOffset = pickField(readClassFields(proc, smEntry.classPtr), ["HeroList"]);
  // Plausibility: HeroList MUST be found (it's a real field name — stable).
  if (heroListOffset === 0) return null;

  const psdFields = psdEntry ? readClassFields(proc, psdEntry.classPtr) : null;
  const petSaveDatasOffset = pickField(psdFields, ["PetSaveData"]);
  const itemSaveDatasOffset = pickField(psdFields, ["itemSaveDatas"]);

  const petFields = petEntry ? readClassFields(proc, petEntry.classPtr) : null;
  const petKeyOffset = pickField(petFields, ["PetKey"]);
  const petUnlockOffset = pickField(petFields, ["IsUnlock"]);

  const itemFields = itemEntry ? readClassFields(proc, itemEntry.classPtr) : null;
  const itemKeyOffset = pickField(itemFields, ["ItemKey"]);
  const itemChaoticOffset = pickField(itemFields, ["IsChaotic"]);

  // ── Build LiveOffsets ──────────────────────────────────────────────────────
  // Structural constants (IL2CPP standard layout — do not change per version).
  const CONTAINER = {
    objectHeader: 0x10,
    listItems: 0x10,
    listSize: 0x18,
    arrayFirst: 0x20,
  } as const;
  const DICT = {
    entries: 0x18,
    count: 0x20,
    entrySize: 24,
    entryHash: 0,
    entryKey: 8,
    entryValue: 16,
  } as const;

  const offsets: LiveOffsets = {
    gameVersion: version,

    typeInfoRva: {
      commonSaveData: csdEntry.slotRva,
      currencyManager: cmRva,
      stageCacheManager: scmEntry?.slotRva ?? 0n,
      stageManager: smEntry.slotRva,
      localInventoryManager: 0n, // unused; inventory reads via PlayerSaveData.itemSaveDatas
      logManager: logEntry?.slotRva ?? 0n,
    },

    player: {
      commonSaveData: 0x10,
      currency: 0x48,
      heroSaveDatas: 0x50,
      petSaveDatas: petSaveDatasOffset,
      itemSaveDatas: itemSaveDatasOffset,
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

    petSaveData: { petKey: petKeyOffset, isUnlock: petUnlockOffset },

    inventoryItem: { itemKey: itemKeyOffset, isChaotic: itemChaoticOffset },

    runtime: {
      currency: { list: 0x0, dict: 0x8, entryInfoData: 0x10, entryObscuredQty: 0x28 },
      stage: {
        currentCache: 0x88,
        cacheInfoData: 0x10,
        stageKey: 0x30,
        waveAmount: 0x54,
        runtimeWave: STRUCT_RUNTIME_WAVE,
      },
      currencyInfoKey: 0x30,
      heroList: heroListOffset,
      log: { logByType: STRUCT_LOG_BY_TYPE, getBoxTypeKey: STRUCT_GETBOX_KEY },
      getBoxLog: { monsterType: STRUCT_GETBOX_TYPE },
    },

    container: CONTAINER,
    dict: DICT,
    il2cppClass: { staticFieldsOffsets: STATIC_FIELDS_CANDIDATES },
    goldKey: 100001,
  };

  // Final plausibility: all critical typeInfoRva slots must be non-zero.
  if (
    offsets.typeInfoRva.commonSaveData === 0n ||
    offsets.typeInfoRva.currencyManager === 0n ||
    offsets.typeInfoRva.stageManager === 0n
  ) {
    return null;
  }

  return offsets;
}
