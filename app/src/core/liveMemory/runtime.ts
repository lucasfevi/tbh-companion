// Runtime IL2CPP reads — live stage (StageCache chain) and live gold
// (CurrencyManager Dictionary<int,T> → ACTk ObscuredLong). Pure: operates over
// an injected MemoryReader so it is unit-testable over synthetic memory maps.

import { readI32, readI64, readPtr, type MemoryReader } from "./memory";
import { plausibleGold, plausibleStage, plausibleWave, type LiveOffsets } from "./offsets";
import { readStaticFieldPtr } from "./statics";
import type { LiveHeroData, LiveInventoryItem, LivePetData } from "../../../shared/types";

export interface RuntimeStage {
  stageKey: number | null;
  wave: number | null;
}

/**
 * Live stage key from `StageCacheManager → StageCache → StageInfoData.StageKey`,
 * plus the wave counter from the `StageManager` singleton when set.
 * Returns null when the cache chain can't be walked (fall back to the save value).
 */
export function readRuntimeStage(
  reader: MemoryReader,
  gaBase: bigint,
  gaSize: number,
  o: LiveOffsets,
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
  const smSingleton = readStaticFieldPtr(
    reader,
    gaBase,
    gaSize,
    o.typeInfoRva.stageManager,
    0,
    candidates,
  );
  if (smSingleton != null) {
    const runtimeWave = readI32(reader, smSingleton + BigInt(o.runtime.stage.runtimeWave));
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
function readGoldFromEntry(
  reader: MemoryReader,
  entryPtr: bigint,
  o: LiveOffsets,
): number | null {
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

// ── Heroes (StageManager.HeroList → List<Hero> → per-hero key/level/exp) ─────

const MAX_HEROES = 20; // sanity cap: game has far fewer party slots

/**
 * Live hero data from `StageManager.HeroList` (real field name at +heroList).
 * Returns null when the singleton or list can't be walked.
 */
export function readRuntimeHeroes(
  reader: MemoryReader,
  gaBase: bigint,
  gaSize: number,
  o: LiveOffsets,
): LiveHeroData[] | null {
  const candidates = o.il2cppClass.staticFieldsOffsets;

  const smSingleton = readStaticFieldPtr(
    reader,
    gaBase,
    gaSize,
    o.typeInfoRva.stageManager,
    0,
    candidates,
  );
  if (smSingleton == null) return null;

  const heroListPtr = readPtr(reader, smSingleton + BigInt(o.runtime.heroList));
  if (heroListPtr == null) return null;

  const itemsArrPtr = readPtr(reader, heroListPtr + BigInt(o.container.listItems));
  if (itemsArrPtr == null) return null;

  const count = readI32(reader, heroListPtr + BigInt(o.container.listSize));
  if (count == null || count <= 0 || count > MAX_HEROES) return null;

  const heroes: LiveHeroData[] = [];
  const first = itemsArrPtr + BigInt(o.container.arrayFirst);

  for (let i = 0; i < count; i++) {
    const heroPtr = readPtr(reader, first + BigInt(i * 8));
    if (heroPtr == null) continue;

    const heroKey = readI32(reader, heroPtr + BigInt(o.hero.heroKey));
    const level = readI32(reader, heroPtr + BigInt(o.hero.level));
    const exp = readI32(reader, heroPtr + BigInt(o.hero.exp));

    if (heroKey == null || heroKey <= 0) continue;
    heroes.push({
      heroKey,
      level: level ?? 1,
      exp: exp ?? 0,
    });
  }

  return heroes.length > 0 ? heroes : null;
}

// ── Box count (StageManager cumulative-boxes-obtained counter) ────────────────

/**
 * Cumulative box count from StageManager.
 * Returns null when the singleton is unavailable or when the field offset
 * has not been derived for this game version (offset === 0, placeholder).
 */
export function readRuntimeBoxCount(
  reader: MemoryReader,
  gaBase: bigint,
  gaSize: number,
  o: LiveOffsets,
): number | null {
  if (o.runtime.stage.boxCount === 0) return null; // offset not yet derived

  const candidates = o.il2cppClass.staticFieldsOffsets;
  const smSingleton = readStaticFieldPtr(
    reader,
    gaBase,
    gaSize,
    o.typeInfoRva.stageManager,
    0,
    candidates,
  );
  if (smSingleton == null) return null;

  const count = readI32(reader, smSingleton + BigInt(o.runtime.stage.boxCount));
  return count != null && count >= 0 ? count : null;
}

// ── Inventory (LocalInventoryManager → bag dicts → InventoryItem entries) ────

const MAX_INVENTORY_ITEMS = 10_000;

/**
 * Live inventory listing from `LocalInventoryManager`.
 * Returns null when the TypeInfo RVA has not been derived for this version
 * (localInventoryManager === 0n, placeholder).
 */
export function readRuntimeInventory(
  reader: MemoryReader,
  gaBase: bigint,
  gaSize: number,
  o: LiveOffsets,
): LiveInventoryItem[] | null {
  if (o.typeInfoRva.localInventoryManager === 0n) return null; // offset not yet derived
  if (o.inventoryItem.itemKey === 0) return null; // struct offsets not yet derived

  const candidates = o.il2cppClass.staticFieldsOffsets;

  // LocalInventoryManager has two bag dicts (equipped + unequipped); walk both.
  // For Phase 2 we expose a unified flat listing keyed by location field.
  const results: LiveInventoryItem[] = [];

  for (const fieldOffset of [0, 8]) {
    const dictPtr = readStaticFieldPtr(
      reader,
      gaBase,
      gaSize,
      o.typeInfoRva.localInventoryManager,
      fieldOffset,
      candidates,
    );
    if (dictPtr == null) continue;

    const entriesArrPtr = readPtr(reader, dictPtr + BigInt(o.dict.entries));
    if (entriesArrPtr == null) continue;
    const count = readI32(reader, dictPtr + BigInt(o.dict.count));
    if (count == null || count <= 0 || count > MAX_INVENTORY_ITEMS) continue;

    const first = entriesArrPtr + BigInt(o.container.arrayFirst);
    for (let i = 0; i < count; i++) {
      const eBase = first + BigInt(i * o.dict.entrySize);
      const hash = readI32(reader, eBase + BigInt(o.dict.entryHash));
      if (hash == null || hash < 0) continue;
      const entryPtr = readPtr(reader, eBase + BigInt(o.dict.entryValue));
      if (entryPtr == null) continue;

      const itemKey = readI32(reader, entryPtr + BigInt(o.inventoryItem.itemKey));
      if (itemKey == null || itemKey <= 0) continue;

      const isChaoticRaw = readI32(reader, entryPtr + BigInt(o.inventoryItem.isChaotic));
      const location = readI32(reader, entryPtr + BigInt(o.inventoryItem.location));

      results.push({
        itemKey,
        isChaotic: (isChaoticRaw ?? 0) !== 0,
        location: location ?? 0,
      });
    }
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
