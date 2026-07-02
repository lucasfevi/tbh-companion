// Runtime IL2CPP reads — live stage (StageCache chain) and live gold
// (CurrencyManager Dictionary<int,T> → ACTk ObscuredLong). Pure: operates over
// an injected MemoryReader so it is unit-testable over synthetic memory maps.

import { readI32, readI64, readPtr, readU32, type MemoryReader } from "./memory";
import { plausibleGold, plausibleStage, plausibleWave, type LiveOffsets } from "./offsets";
import { readStaticFieldPtr, readStaticFieldsBlock } from "./statics";
import type { LiveHeroData, LiveInventoryItem, LivePetData } from "../../../shared/types";

export interface RuntimeStage {
  stageKey: number | null;
  wave: number | null;
}

/**
 * Live stage key from `StageCacheManager → StageCache → StageInfoData.StageKey`,
 * plus the wave counter from the `StageManager` singleton when set.
 * `smPtr` is the resolved StageManager instance (see {@link resolveStageManager});
 * pass null when it could not be resolved — wave then falls back to the save value.
 * Returns null when the cache chain can't be walked (fall back to the save value).
 */
export function readRuntimeStage(
  reader: MemoryReader,
  gaBase: bigint,
  gaSize: number,
  o: LiveOffsets,
  smPtr: bigint | null,
): RuntimeStage | null {
  const candidates = o.il2cppClass.staticFieldsOffsets;

  const stageCachePtr = readStaticFieldPtr(
    reader,
    gaBase,
    gaSize,
    o.typeInfoRva.stageCacheManager,
    o.runtime.stage.currentCache,
    candidates,
  );
  if (stageCachePtr == null) return null;

  const stageInfoPtr = readPtr(reader, stageCachePtr + BigInt(o.runtime.stage.cacheInfoData));
  if (stageInfoPtr == null) return null;

  const stageKey = readI32(reader, stageInfoPtr + BigInt(o.runtime.stage.stageKey));

  // StageManager singleton runtime wave counter, when positive.
  let wave: number | null = null;
  if (smPtr != null) {
    const runtimeWave = readI32(reader, smPtr + BigInt(o.runtime.stage.runtimeWave));
    if (plausibleWave(runtimeWave)) wave = runtimeWave;
  }

  return {
    stageKey: plausibleStage(stageKey) ? stageKey : null,
    wave,
  };
}

// ── Gold (CurrencyManager → Dictionary<int,T> → ACTk ObscuredLong) ──────────

/** Per-reader-instance pin state for gold: avoids re-walking the dict every tick. */
export interface GoldPinState {
  /** Cached pointer to the currency entry for `goldKey`; null when unknown/stale. */
  entryPtr: bigint | null;
  /** Last successfully decoded gold value; returned when all reads fail. */
  lastKnown: number | null;
}

export function makeGoldPinState(): GoldPinState {
  return { entryPtr: null, lastKnown: null };
}

/** Walk `Dictionary<int, T>` entries and return the value pointer for a matching int key. */
function dictLookupIntKey(
  reader: MemoryReader,
  dictPtr: bigint,
  key: number,
  o: LiveOffsets,
): bigint | null {
  const entriesArrPtr = readPtr(reader, dictPtr + BigInt(o.dict.entries));
  if (entriesArrPtr == null) return null;
  const count = readI32(reader, dictPtr + BigInt(o.dict.count));
  if (count == null || count <= 0 || count > 100_000) return null;
  const first = entriesArrPtr + BigInt(o.container.arrayFirst);
  for (let i = 0; i < count; i++) {
    const eBase = first + BigInt(i * o.dict.entrySize);
    const hash = readI32(reader, eBase + BigInt(o.dict.entryHash));
    if (hash == null || hash < 0) continue; // deleted / unused slot
    const entryKey = readI32(reader, eBase + BigInt(o.dict.entryKey));
    if (entryKey !== key) continue;
    return readPtr(reader, eBase + BigInt(o.dict.entryValue));
  }
  return null;
}

/** Decode one ACTk ObscuredLong from its struct base address. */
function readObscuredLong(reader: MemoryReader, structAddr: bigint): bigint | null {
  const hidden = readI64(reader, structAddr + 8n);
  const crypto = readI64(reader, structAddr + 16n);
  if (hidden == null || crypto == null) return null;
  return (hidden - crypto) ^ crypto;
}

const BURST_ATTEMPTS = 4;

/** Burst-read the ObscuredLong from a pinned currency entry (up to 4 attempts). */
function readGoldFromEntry(reader: MemoryReader, entryPtr: bigint, o: LiveOffsets): number | null {
  const structAddr = entryPtr + BigInt(o.runtime.currency.entryObscuredQty);
  for (let attempt = 0; attempt < BURST_ATTEMPTS; attempt++) {
    const raw = readObscuredLong(reader, structAddr);
    if (raw == null) continue;
    const v = Number(raw);
    if (plausibleGold(v)) return v;
  }
  return null;
}

/**
 * Live gold from `CurrencyManager → Dictionary<int, uz.tn> → ObscuredLong`.
 * Uses a per-caller `GoldPinState` to cache the entry pointer across ticks.
 * Returns `pin.lastKnown` when all reads fail (stale rather than null).
 */
export function readRuntimeGold(
  reader: MemoryReader,
  gaBase: bigint,
  gaSize: number,
  o: LiveOffsets,
  pin: GoldPinState,
): number | null {
  const candidates = o.il2cppClass.staticFieldsOffsets;

  // Fast path: try the cached entry pointer.
  if (pin.entryPtr != null) {
    const v = readGoldFromEntry(reader, pin.entryPtr, o);
    if (v != null) {
      pin.lastKnown = v;
      return v;
    }
    pin.entryPtr = null; // stale — GC may have moved the entry; re-walk
  }

  // Dict walk: CurrencyManager static field → dict → entry for goldKey.
  const dictPtr = readStaticFieldPtr(
    reader,
    gaBase,
    gaSize,
    o.typeInfoRva.currencyManager,
    o.runtime.currency.dict,
    candidates,
  );
  if (dictPtr != null) {
    const entryPtr = dictLookupIntKey(reader, dictPtr, o.goldKey, o);
    if (entryPtr != null) {
      const v = readGoldFromEntry(reader, entryPtr, o);
      if (v != null) {
        pin.entryPtr = entryPtr;
        pin.lastKnown = v;
        return v;
      }
    }
  }

  // All paths failed — return last known rather than null to reduce UI flicker.
  return pin.lastKnown;
}

// ── ACTk Obscured value decode (level = ObscuredInt, exp = ObscuredFloat) ─────

/** Swap bytes [1] and [2] of a 32-bit little-endian word (ObscuredFloat quirk). */
function byteswap12(v: number): number {
  return (
    ((v & 0xff) | (((v >>> 16) & 0xff) << 8) | (((v >>> 8) & 0xff) << 16) | (v & 0xff000000)) >>> 0
  );
}

/** Reinterpret a uint32 bit pattern as an IEEE-754 float32. */
function u32ToF32(bits: number): number {
  const dv = new DataView(new ArrayBuffer(4));
  dv.setUint32(0, bits >>> 0, true);
  return dv.getFloat32(0, true);
}

/** Decode an ACTk ObscuredInt to a signed int32: `(hidden - key) ^ key`. */
function decodeObscuredInt(hidden: number | null, key: number | null): number | null {
  if (hidden == null || key == null) return null;
  const raw = ((((hidden - key) & 0xffffffff) >>> 0) ^ key) >>> 0;
  return raw | 0; // reinterpret as signed
}

/** Decode an ACTk ObscuredFloat to a float32: `f32(key ^ byteswap12(hidden))`. */
function decodeObscuredFloat(hidden: number | null, key: number | null): number | null {
  if (hidden == null || key == null) return null;
  return u32ToF32((key ^ byteswap12(hidden)) >>> 0);
}

// ── Heroes (StageManager.HeroList → Hero[] → Unit.cache → HeroRuntime) ────────

const MAX_HEROES = 20; // sanity cap: game has far fewer party slots
/** Reject decoded runtime exp above this (corrupted memory / bad Obscured decode). */
const MAX_HERO_RUNTIME_EXP = 1e12;

/**
 * Read the live party off a resolved StageManager instance.
 *
 * `HeroList` is a `Hero[]` of deployed party members. Each element is a runtime
 * `Unit`, whose identity/level/exp live behind `Unit.cache → HeroRuntime`
 * (NOT the save-layer HeroSaveData offsets). Level/exp are ACTk Obscured values.
 */
function readParty(reader: MemoryReader, smPtr: bigint, o: LiveOffsets): LiveHeroData[] | null {
  const heroListPtr = readPtr(reader, smPtr + BigInt(o.runtime.heroList));
  if (heroListPtr == null) return null;

  // HeroList is Hero[] (direct IL2CPP array): length at +listSize, elements at +arrayFirst.
  const count = readI32(reader, heroListPtr + BigInt(o.container.listSize));
  if (count == null || count <= 0 || count > MAX_HEROES) return null;

  const heroes: LiveHeroData[] = [];
  const first = heroListPtr + BigInt(o.container.arrayFirst);

  for (let i = 0; i < count; i++) {
    const heroPtr = readPtr(reader, first + BigInt(i * 8));
    if (heroPtr == null) continue;

    const runtimePtr = readPtr(reader, heroPtr + BigInt(o.unit.cache));
    if (runtimePtr == null) continue;

    const infoPtr = readPtr(reader, runtimePtr + BigInt(o.heroRuntime.info));
    if (infoPtr == null) continue;

    const heroKey = readI32(reader, infoPtr + BigInt(o.heroInfoData.heroKey));
    if (heroKey == null || heroKey <= 0 || heroKey >= 10_000_000) continue;

    const level = decodeObscuredInt(
      readU32(reader, runtimePtr + BigInt(o.heroRuntime.levelHidden)),
      readU32(reader, runtimePtr + BigInt(o.heroRuntime.levelKey)),
    );
    const exp = decodeObscuredFloat(
      readU32(reader, runtimePtr + BigInt(o.heroRuntime.expHidden)),
      readU32(reader, runtimePtr + BigInt(o.heroRuntime.expKey)),
    );

    heroes.push({
      heroKey,
      level: level != null && level > 0 && level <= 200 ? level : 1,
      exp: exp != null && exp >= 0 && Number.isFinite(exp) && exp <= MAX_HERO_RUNTIME_EXP ? exp : 0,
    });
  }

  return heroes.length > 0 ? heroes : null;
}

/**
 * Live hero data for the deployed party.
 * `smPtr` is the resolved StageManager instance (see {@link resolveStageManager});
 * returns null when it is unresolved or the party can't be walked.
 */
export function readRuntimeHeroes(
  reader: MemoryReader,
  o: LiveOffsets,
  smPtr: bigint | null,
): LiveHeroData[] | null {
  if (smPtr == null) return null;
  return readParty(reader, smPtr, o);
}

// ── StageManager singleton resolution ────────────────────────────────────────

/** Per-reader-instance pin for the StageManager instance pointer. */
export interface SmPinState {
  ptr: bigint | null;
}

export function makeSmPinState(): SmPinState {
  return { ptr: null };
}

// The singleton `Instance` static field's offset within the class static block is
// not name-stable, so scan the block for the pointer that resolves a live party.
const SM_STATIC_SCAN_MAX = 0x100;

/** A candidate StageManager is "live" when it exposes a walkable, non-empty party. */
function isLiveStageManager(reader: MemoryReader, ptr: bigint, o: LiveOffsets): boolean {
  return readParty(reader, ptr, o) != null;
}

/**
 * Resolve the live `StageManager` instance pointer.
 *
 * The instance is not stored in a name-stable static field, so we scan the
 * StageManager class static block for the pointer whose `HeroList` resolves a
 * real party (`readParty`). The winning pointer is pinned and re-validated each
 * tick; a full re-scan happens only when the pin goes stale (e.g. scene reload).
 * Returns null between stages when no party is deployed — callers fall back to
 * save-file values for the affected stats.
 */
export function resolveStageManager(
  reader: MemoryReader,
  gaBase: bigint,
  gaSize: number,
  o: LiveOffsets,
  pin: SmPinState,
): bigint | null {
  if (pin.ptr != null && isLiveStageManager(reader, pin.ptr, o)) return pin.ptr;
  pin.ptr = null;

  const block = readStaticFieldsBlock(
    reader,
    gaBase,
    gaSize,
    o.typeInfoRva.stageManager,
    o.il2cppClass.staticFieldsOffsets,
  );
  if (block == null) return null;

  for (let off = 0; off <= SM_STATIC_SCAN_MAX; off += 8) {
    const cand = readPtr(reader, block + BigInt(off));
    if (cand == null) continue;
    if (isLiveStageManager(reader, cand, o)) {
      pin.ptr = cand;
      return cand;
    }
  }
  return null;
}

// ── Live chest drops (LogManager → Dictionary<ELogType, List<GetBoxLog>>) ─────

/** Chest drop category derived from GetBoxLog's EMonsterLogType field. */
export type LiveChestCategory = "common" | "rare";

/** Per-reader pin for a resolved LogManager instance pointer. */
export interface LogManagerPinState {
  ptr: bigint | null;
}

/**
 * Per-reader pin for the LogManager instance pointer and a log-list tail
 * position. `primed` guards against counting the pre-attach log backlog.
 * Shared shape for every `ELogType` bucket tailed this way (chest drops,
 * stage clears, …).
 */
export interface ChestLogPinState extends LogManagerPinState {
  lastCount: number;
  primed: boolean;
}

export function makeChestLogPinState(): ChestLogPinState {
  return { ptr: null, lastCount: 0, primed: false };
}

const MAX_CHEST_LOG = 5_000;
const LM_STATIC_SCAN_MAX = 0x100;

/** EMonsterLogType → chest category (0 common, 1 stage boss; act boss ignored). */
function chestCategoryFromMonsterType(t: number): LiveChestCategory | null {
  if (t === 0) return "common";
  if (t === 1) return "rare";
  return null;
}

/** Resolve the GetBox `List<GetBoxLog>` backing array + length from a LogManager instance. */
function getBoxLogList(
  reader: MemoryReader,
  lmPtr: bigint,
  o: LiveOffsets,
): { arr: bigint; count: number } | null {
  const dictPtr = readPtr(reader, lmPtr + BigInt(o.runtime.log.logByType));
  if (dictPtr == null) return null;
  const listPtr = dictLookupIntKey(reader, dictPtr, o.runtime.log.getBoxTypeKey, o);
  if (listPtr == null) return null;
  const arr = readPtr(reader, listPtr + BigInt(o.container.listItems));
  if (arr == null) return null;
  const count = readI32(reader, listPtr + BigInt(o.container.listSize));
  if (count == null || count < 0 || count > MAX_CHEST_LOG) return null;
  return { arr, count };
}

/** A LogManager candidate is valid when its GetBox log list is walkable. */
function isLiveLogManager(reader: MemoryReader, ptr: bigint, o: LiveOffsets): boolean {
  return getBoxLogList(reader, ptr, o) != null;
}

/**
 * Resolve the live `LogManager` instance pointer by scanning its class static
 * block for the pointer whose GetBox log list is walkable. Pinned and revalidated
 * each tick. Returns null when the TypeInfo RVA has not been derived yet
 * (`logManager === 0n`) — the offset extractor fills it at runtime.
 */
/**
 * Resolve the live `LogManager` instance pointer. Shared by every log-tailing
 * reader (chest drops, stage clears, …) — the resolution itself only depends
 * on the class anchor + a walkable GetBox list as its liveness check, not on
 * which `ELogType` bucket the caller ultimately tails.
 */
export function resolveLogManager(
  reader: MemoryReader,
  gaBase: bigint,
  gaSize: number,
  o: LiveOffsets,
  pin: LogManagerPinState,
): bigint | null {
  if (o.typeInfoRva.logManager === 0n) return null;
  if (pin.ptr != null && isLiveLogManager(reader, pin.ptr, o)) return pin.ptr;
  pin.ptr = null;

  const block = readStaticFieldsBlock(
    reader,
    gaBase,
    gaSize,
    o.typeInfoRva.logManager,
    o.il2cppClass.staticFieldsOffsets,
  );
  if (block == null) return null;

  for (let off = 0; off <= LM_STATIC_SCAN_MAX; off += 8) {
    const cand = readPtr(reader, block + BigInt(off));
    if (cand == null) continue;
    if (isLiveLogManager(reader, cand, o)) {
      pin.ptr = cand;
      return cand;
    }
  }
  return null;
}

/**
 * Chest drops added to the GetBox log since the last read, classified by
 * EMonsterLogType. Tails the log by index; on first read it primes to the
 * current length (so the pre-attach backlog is not counted) and returns `[]`.
 * When the log shrinks (a new run clears it) the tail restarts from 0.
 * Returns null when the LogManager can't be resolved (offset not derived / no
 * battle) — distinct from `[]` (resolved, no new drops).
 */
export function readRuntimeChestLog(
  reader: MemoryReader,
  gaBase: bigint,
  gaSize: number,
  o: LiveOffsets,
  pin: ChestLogPinState,
): LiveChestCategory[] | null {
  const lmPtr = resolveLogManager(reader, gaBase, gaSize, o, pin);
  if (lmPtr == null) return null;
  const list = getBoxLogList(reader, lmPtr, o);
  if (list == null) return null;

  const { arr, count } = list;
  if (!pin.primed) {
    pin.lastCount = count;
    pin.primed = true;
    return [];
  }

  const start = count < pin.lastCount ? 0 : pin.lastCount;
  const drops: LiveChestCategory[] = [];
  const first = arr + BigInt(o.container.arrayFirst);
  for (let i = start; i < count; i++) {
    const entryPtr = readPtr(reader, first + BigInt(i * 8));
    if (entryPtr == null) continue;
    const mt = readI32(reader, entryPtr + BigInt(o.runtime.getBoxLog.monsterType));
    const cat = mt == null ? null : chestCategoryFromMonsterType(mt);
    if (cat) drops.push(cat);
  }
  pin.lastCount = count;
  return drops;
}

// ── Live stage clears (LogManager → Dictionary<ELogType, List<StageClearLog>>) ─

/** Per-reader pin for the LogManager instance pointer and the StageClear-log tail position. */
export type StageClearPinState = ChestLogPinState;

export function makeStageClearPinState(): StageClearPinState {
  return { ptr: null, lastCount: 0, primed: false };
}

const MAX_STAGE_CLEAR_LOG = 5_000;
/** Reject implausible clear times (corrupted memory / mid-write read). */
const MAX_CLEAR_TIME_SEC = 36_000;

/** Resolve the StageClear `List<StageClearLog>` backing array + length from a LogManager instance. */
function stageClearLogList(
  reader: MemoryReader,
  lmPtr: bigint,
  o: LiveOffsets,
): { arr: bigint; count: number } | null {
  const dictPtr = readPtr(reader, lmPtr + BigInt(o.runtime.log.logByType));
  if (dictPtr == null) return null;
  const listPtr = dictLookupIntKey(reader, dictPtr, o.runtime.log.stageClearTypeKey, o);
  if (listPtr == null) return null;
  const arr = readPtr(reader, listPtr + BigInt(o.container.listItems));
  if (arr == null) return null;
  const count = readI32(reader, listPtr + BigInt(o.container.listSize));
  if (count == null || count < 0 || count > MAX_STAGE_CLEAR_LOG) return null;
  return { arr, count };
}

/**
 * Clear times (whole seconds, as recorded by the game) added to the
 * StageClear log since the last read. Tails the log by index the same way
 * {@link readRuntimeChestLog} tails GetBox: primes to the current length on
 * first read (backlog not counted) and returns `[]`; restarts the tail from 0
 * if the log shrinks (new run cleared it). Returns null when the LogManager
 * can't be resolved — distinct from `[]` (resolved, no new clears this tick).
 * Stage attribution is the caller's job (the live/save stageKey at read time);
 * the log entry's own act/stage ints don't carry difficulty.
 */
export function readRuntimeStageClears(
  reader: MemoryReader,
  gaBase: bigint,
  gaSize: number,
  o: LiveOffsets,
  pin: StageClearPinState,
): number[] | null {
  const lmPtr = resolveLogManager(reader, gaBase, gaSize, o, pin);
  if (lmPtr == null) return null;
  const list = stageClearLogList(reader, lmPtr, o);
  if (list == null) return null;

  const { arr, count } = list;
  if (!pin.primed) {
    pin.lastCount = count;
    pin.primed = true;
    return [];
  }

  const start = count < pin.lastCount ? 0 : pin.lastCount;
  const clears: number[] = [];
  const first = arr + BigInt(o.container.arrayFirst);
  for (let i = start; i < count; i++) {
    const entryPtr = readPtr(reader, first + BigInt(i * 8));
    if (entryPtr == null) continue;
    const clearTimeSec = readI32(reader, entryPtr + BigInt(o.runtime.stageClearLog.clearTimeSec));
    if (clearTimeSec != null && clearTimeSec > 0 && clearTimeSec < MAX_CLEAR_TIME_SEC) {
      clears.push(clearTimeSec);
    }
  }
  pin.lastCount = count;
  return clears;
}

// ── Inventory (PlayerSaveData.itemSaveDatas → ItemSaveData entries) ───────────

const MAX_INVENTORY_ITEMS = 100_000;

/**
 * Live inventory listing from the `PlayerSaveData.itemSaveDatas` save snapshot
 * reached via `CommonSaveData → player`. This is the same anchor the pet reader
 * uses; it avoids depending on the LocalInventoryManager static instance.
 * Returns null when the item-list offset has not been derived for this version.
 */
export function readRuntimeInventory(
  reader: MemoryReader,
  gaBase: bigint,
  gaSize: number,
  o: LiveOffsets,
): LiveInventoryItem[] | null {
  if (o.player.itemSaveDatas === 0) return null; // offset not yet derived
  if (o.inventoryItem.itemKey === 0) return null; // struct offsets not yet derived

  const candidates = o.il2cppClass.staticFieldsOffsets;

  const playerPtr = readStaticFieldPtr(
    reader,
    gaBase,
    gaSize,
    o.typeInfoRva.commonSaveData,
    o.player.commonSaveData,
    candidates,
  );
  if (playerPtr == null) return null;

  const listPtr = readPtr(reader, playerPtr + BigInt(o.player.itemSaveDatas));
  if (listPtr == null) return null;

  const itemsArrPtr = readPtr(reader, listPtr + BigInt(o.container.listItems));
  if (itemsArrPtr == null) return null;

  const count = readI32(reader, listPtr + BigInt(o.container.listSize));
  if (count == null || count <= 0 || count > MAX_INVENTORY_ITEMS) return null;

  const results: LiveInventoryItem[] = [];
  const first = itemsArrPtr + BigInt(o.container.arrayFirst);

  for (let i = 0; i < count; i++) {
    const entryPtr = readPtr(reader, first + BigInt(i * 8));
    if (entryPtr == null) continue;

    const itemKey = readI32(reader, entryPtr + BigInt(o.inventoryItem.itemKey));
    if (itemKey == null || itemKey <= 0) continue;

    const isChaoticRaw = readI32(reader, entryPtr + BigInt(o.inventoryItem.isChaotic));

    results.push({ itemKey, isChaotic: (isChaoticRaw ?? 0) !== 0 });
  }

  return results.length > 0 ? results : null;
}

// ── Pets (PlayerSaveData.PetSaveData array) ───────────────────────────────────

const MAX_PETS = 500;

/**
 * Live pet data from the save-layer `PlayerSaveData.PetSaveData` array.
 * Returns null when struct offsets have not been derived for this version.
 */
export function readRuntimePets(
  reader: MemoryReader,
  gaBase: bigint,
  gaSize: number,
  o: LiveOffsets,
): LivePetData[] | null {
  if (o.player.petSaveDatas === 0) return null; // offset not yet derived
  if (o.petSaveData.petKey === 0) return null;

  const candidates = o.il2cppClass.staticFieldsOffsets;

  // CommonSaveData → player → petSaveDatas (List<PetSaveData>)
  const playerPtr = readStaticFieldPtr(
    reader,
    gaBase,
    gaSize,
    o.typeInfoRva.commonSaveData,
    o.player.commonSaveData,
    candidates,
  );
  if (playerPtr == null) return null;

  const petListPtr = readPtr(reader, playerPtr + BigInt(o.player.petSaveDatas));
  if (petListPtr == null) return null;

  const itemsArrPtr = readPtr(reader, petListPtr + BigInt(o.container.listItems));
  if (itemsArrPtr == null) return null;

  const count = readI32(reader, petListPtr + BigInt(o.container.listSize));
  if (count == null || count <= 0 || count > MAX_PETS) return null;

  const results: LivePetData[] = [];
  const first = itemsArrPtr + BigInt(o.container.arrayFirst);

  for (let i = 0; i < count; i++) {
    const petPtr = readPtr(reader, first + BigInt(i * 8));
    if (petPtr == null) continue;

    const petKey = readI32(reader, petPtr + BigInt(o.petSaveData.petKey));
    if (petKey == null || petKey <= 0) continue;

    const isUnlockRaw = readI32(reader, petPtr + BigInt(o.petSaveData.isUnlock));

    results.push({ petKey, unlocked: (isUnlockRaw ?? 0) !== 0 });
  }

  return results.length > 0 ? results : null;
}
