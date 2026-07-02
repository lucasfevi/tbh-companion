// Pure IL2CPP class/field scanner + structural anchor detectors — used by the
// runtime offset extractor. Injects MemoryReader so it is unit-testable over
// FakeMemory. No node / electron / koffi imports.
//
// Detection strategy (validated live against game v1.00.23): per-build name
// randomization renames most manager classes AND their singleton wrappers, so
// anchors are found structurally — by what their static fields point at — and
// only serialization-stable names ("StageCache", "StageInfoData", "GetBoxLog",
// "HeroList", "PetSaveData", …) are trusted as identifiers.

import { readI32, readI64, readPtr, type MemoryReader } from "./memory";
import { plausibleGold } from "./offsets";

// ── IL2CPP metadata layout (x64, stable across recent Unity versions) ────────

const IL2CPP_CLASS_NAME_OFFSET = 0x10n;
const IL2CPP_CLASS_FIELDS_OFFSET = 0x80n; // Il2CppClass.fields: Il2CppFieldInfo*
const IL2CPP_CLASS_FIELDS_ALT_OFFSET = 0x88n; // fallback when 0x80 yields null
const IL2CPP_FIELD_INFO_SIZE = 0x20; // sizeof(Il2CppFieldInfo) — x64
const IL2CPP_FIELD_NAME_OFFSET = 0x0n;
const IL2CPP_FIELD_OFFSET_OFFSET = 0x18n;
const MAX_CLASS_NAME_LEN = 128;
const MAX_FIELDS = 200;

/** Il2CppClass.static_fields candidate offsets (varies slightly per Unity build). */
export const STATIC_FIELDS_CANDIDATES = [0xb0, 0xb8, 0xa8] as const;

// ── Game-structural constants (obfuscated names, stable byte offsets) ─────────

/** Standard IL2CPP container layout — shared with the emitted LiveOffsets. */
export const STRUCT_CONTAINER = {
  objectHeader: 0x10,
  listItems: 0x10,
  listSize: 0x18,
  arrayFirst: 0x20,
} as const;

/** Standard `Dictionary<int, T>` layout — shared with the emitted LiveOffsets. */
export const STRUCT_DICT = {
  entries: 0x18,
  count: 0x20,
  entrySize: 24,
  entryHash: 0,
  entryKey: 8,
  entryValue: 16,
} as const;

const STRUCT_LOG_BY_TYPE = 0x28; // LogManager.<logByType>: Dictionary<ELogType, List<LogData>>
const STRUCT_GETBOX_TYPE_KEY = 3; // ELogType.GetBox
const STRUCT_GETBOX_MONSTER_TYPE = 0x50; // GetBoxLog EMonsterLogType (0/1/2)
const STRUCT_CACHE_INFO_DATA = 0x10; // StageCache → StageInfoData
const STRUCT_STAGE_CACHE_STATIC_OFF = 0x88; // vb.uu / uz.us current StageCache static field
const STRUCT_CURRENCY_DICT = 0x8; // currency-manager statics: dict at +8 (list at +0)
const STRUCT_OBSCURED_QTY = 0x28; // currency entry → ACTk ObscuredLong quantity

/** How deep into a class's static block the detectors look for anchors. */
const STATIC_SCAN_MAX = 0x100;
/** How deep into an object's instance fields the player-list hunt looks. */
const INSTANCE_SCAN_MAX = 0x140;

function isPlausibleHeapPtr(v: bigint): boolean {
  return v > 0x10000n && v < 0x7ff0_0000_0000n;
}

// ── Primitive readers ─────────────────────────────────────────────────────────

/**
 * Read a null-terminated ASCII/UTF-8 C string at `ptr`.
 * Returns null if the pointer is implausible, the memory is unreadable, or the
 * string contains non-printable characters (class/field names never do).
 * Reads up to `maxLen` bytes (default 128).
 */
export function readCString(
  reader: MemoryReader,
  ptr: bigint,
  maxLen = MAX_CLASS_NAME_LEN,
): string | null {
  if (!isPlausibleHeapPtr(ptr)) return null;
  const buf = reader.readBytes(ptr, maxLen);
  if (!buf || buf.length === 0) return null;
  const end = buf.indexOf(0);
  const bytes = buf.subarray(0, end === -1 ? buf.length : end);
  if (bytes.length === 0) return null;
  for (const b of bytes) {
    if (b < 0x20 || b > 0x7e) return null;
  }
  return bytes.toString("utf8");
}

/**
 * Walk `Il2CppFieldInfo[]` at `classPtr + 0x80` (fallback +0x88).
 * Each entry is 0x20 bytes: name: char* @+0x0, offset: int32 @+0x18.
 * Stops when the name pointer is null/unreadable or after `maxFields` entries.
 * Returns null when the fields base pointer is unreadable.
 */
export function readClassFields(
  reader: MemoryReader,
  classPtr: bigint,
  maxFields = MAX_FIELDS,
): Map<string, number> | null {
  let fieldsPtr = readPtr(reader, classPtr + IL2CPP_CLASS_FIELDS_OFFSET);
  if (fieldsPtr == null) {
    fieldsPtr = readPtr(reader, classPtr + IL2CPP_CLASS_FIELDS_ALT_OFFSET);
  }
  if (fieldsPtr == null) return null;

  const map = new Map<string, number>();
  for (let i = 0; i < maxFields; i++) {
    const base = fieldsPtr + BigInt(i * IL2CPP_FIELD_INFO_SIZE);
    const namePtr = readPtr(reader, base + IL2CPP_FIELD_NAME_OFFSET);
    if (namePtr == null) break; // end of array
    const name = readCString(reader, namePtr);
    if (name == null) break;
    const offset = readI32(reader, base + IL2CPP_FIELD_OFFSET_OFFSET);
    if (offset != null) {
      map.set(name, offset);
    }
  }

  return map.size > 0 ? map : null;
}

/** Decode one ACTk ObscuredLong from its struct base address. */
function readObscuredLong(reader: MemoryReader, structAddr: bigint): bigint | null {
  const hidden = readI64(reader, structAddr + 8n);
  const crypto = readI64(reader, structAddr + 16n);
  if (hidden == null || crypto == null) return null;
  return (hidden - crypto) ^ crypto;
}

/** Walk `Dictionary<int, T>` entries and return the value pointer for `key`. */
function dictLookupIntKey(
  reader: MemoryReader,
  dictPtr: bigint,
  key: number,
  maxCount: number,
  maxScan: number,
): bigint | null {
  const entriesArr = readPtr(reader, dictPtr + BigInt(STRUCT_DICT.entries));
  if (entriesArr == null || !isPlausibleHeapPtr(entriesArr)) return null;
  const count = readI32(reader, dictPtr + BigInt(STRUCT_DICT.count));
  if (count == null || count <= 0 || count > maxCount) return null;
  const first = entriesArr + BigInt(STRUCT_CONTAINER.arrayFirst);
  const limit = Math.min(count, maxScan);
  for (let i = 0; i < limit; i++) {
    const eBase = first + BigInt(i * STRUCT_DICT.entrySize);
    const hash = readI32(reader, eBase + BigInt(STRUCT_DICT.entryHash));
    if (hash == null || hash < 0) continue; // deleted / unused slot
    if (readI32(reader, eBase + BigInt(STRUCT_DICT.entryKey)) !== key) continue;
    return readPtr(reader, eBase + BigInt(STRUCT_DICT.entryValue));
  }
  return null;
}

// ── Scan context: cached class-metadata lookups ───────────────────────────────

/**
 * Read-through caches over one attached process. Class names, field maps, and
 * static-slot walks are each resolved at most once per Il2CppClass, which keeps
 * the structural detectors affordable over tens of thousands of candidates.
 */
export class ScanContext {
  private readonly names = new Map<bigint, string | null>();
  private readonly fields = new Map<bigint, Map<string, number> | null>();
  private readonly statics = new Map<bigint, ReadonlyArray<{ soff: number; value: bigint }>>();

  constructor(readonly reader: MemoryReader) {}

  /** `Il2CppClass.name`, cached; null when unreadable or non-printable. */
  className(classPtr: bigint): string | null {
    const hit = this.names.get(classPtr);
    if (hit !== undefined) return hit;
    const namePtr = readPtr(this.reader, classPtr + IL2CPP_CLASS_NAME_OFFSET);
    const name = namePtr != null ? readCString(this.reader, namePtr) : null;
    this.names.set(classPtr, name);
    return name;
  }

  /** Field name → instance offset map, cached per class. */
  classFields(classPtr: bigint): Map<string, number> | null {
    const hit = this.fields.get(classPtr);
    if (hit !== undefined) return hit;
    const f = readClassFields(this.reader, classPtr);
    this.fields.set(classPtr, f);
    return f;
  }

  /** Class name of a live object via its IL2CPP header (`*obj` = Il2CppClass*). */
  instanceClassName(objPtr: bigint): string | null {
    const klass = readPtr(this.reader, objPtr);
    if (klass == null || !isPlausibleHeapPtr(klass)) return null;
    return this.className(klass);
  }

  /** Field map of a live object's class via its IL2CPP header. */
  instanceClassFields(objPtr: bigint): Map<string, number> | null {
    const klass = readPtr(this.reader, objPtr);
    if (klass == null || !isPlausibleHeapPtr(klass)) return null;
    if (this.className(klass) == null) return null;
    return this.classFields(klass);
  }

  /** static_fields block pointer (tries the known Il2CppClass layout offsets). */
  staticBlock(classPtr: bigint): bigint | null {
    for (const off of STATIC_FIELDS_CANDIDATES) {
      const p = readPtr(this.reader, classPtr + BigInt(off));
      if (p != null && isPlausibleHeapPtr(p)) return p;
    }
    return null;
  }

  /** Plausible pointers in the class's static block (first 0x100 bytes), cached. */
  staticSlots(classPtr: bigint): ReadonlyArray<{ soff: number; value: bigint }> {
    const hit = this.statics.get(classPtr);
    if (hit !== undefined) return hit;
    const out: Array<{ soff: number; value: bigint }> = [];
    const sb = this.staticBlock(classPtr);
    if (sb != null) {
      for (let soff = 0; soff <= STATIC_SCAN_MAX; soff += 8) {
        const v = readPtr(this.reader, sb + BigInt(soff));
        if (v != null && isPlausibleHeapPtr(v)) out.push({ soff, value: v });
      }
    }
    this.statics.set(classPtr, out);
    return out;
  }
}

// ── Class-slot collection (bulk chunked reads) ────────────────────────────────

export interface ScanRegion {
  base: bigint;
  size: number;
}

export interface ClassEntry {
  classPtr: bigint;
  /** TypeInfo slot RVA: address of the slot holding classPtr, relative to gaBase. */
  slotRva: bigint;
  name: string;
}

export interface CollectStats {
  slotsScanned: number;
  pointerTargets: number;
  namedClasses: number;
}

const DEFAULT_CHUNK = 1 << 22; // 4 MiB per ReadProcessMemory call

/**
 * Scan the given regions (8-byte-aligned slots, bulk chunked reads) and index
 * every slot whose value dereferences to a named Il2CppClass. Deduplicates by
 * class pointer, keeping the first slot found — the TypeInfo table entry.
 */
export function collectClassEntries(
  ctx: ScanContext,
  gaBase: bigint,
  regions: readonly ScanRegion[],
  chunkSize = DEFAULT_CHUNK,
): { entries: ClassEntry[]; stats: CollectStats } {
  const slotByTarget = new Map<bigint, bigint>();
  let slotsScanned = 0;

  for (const region of regions) {
    for (let off = 0; off < region.size; off += chunkSize) {
      const size = Math.min(chunkSize, region.size - off);
      const buf = ctx.reader.readBytes(region.base + BigInt(off), size);
      if (!buf) continue;
      for (let i = 0; i + 8 <= buf.length; i += 8) {
        slotsScanned++;
        const v = buf.readBigUInt64LE(i);
        if (!isPlausibleHeapPtr(v)) continue;
        if (!slotByTarget.has(v)) {
          slotByTarget.set(v, region.base + BigInt(off) + BigInt(i) - gaBase);
        }
      }
    }
  }

  const entries: ClassEntry[] = [];
  for (const [classPtr, slotRva] of slotByTarget) {
    const name = ctx.className(classPtr);
    if (name != null) entries.push({ classPtr, slotRva, name });
  }
  return {
    entries,
    stats: {
      slotsScanned,
      pointerTargets: slotByTarget.size,
      namedClasses: entries.length,
    },
  };
}

// ── Anchor detectors ──────────────────────────────────────────────────────────

const MAX_LOG_DICT_ENTRIES = 64;
const MAX_CHEST_LOG = 5_000;
const LOG_VALIDATE_ENTRIES = 20;
const MAX_CURRENCY_DICT = 100_000;
const CURRENCY_DICT_SCAN = 512;

function isStageCacheClassName(name: string | null): boolean {
  return (
    name === "StageCache" || name === "vb.StageCache" || (name?.endsWith(".StageCache") ?? false)
  );
}

/** True when `block` looks like the currency static store (List at +0, Dict at +8). */
function staticBlockHasCurrencyShape(ctx: ScanContext, block: bigint): boolean {
  const list = readPtr(ctx.reader, block);
  const dict = readPtr(ctx.reader, block + 8n);
  return list != null && isPlausibleHeapPtr(list) && dict != null && isPlausibleHeapPtr(dict);
}

/** Gold probe on a currency static block — same disambiguation as the singleton path. */
function staticBlockPassesGoldProbe(ctx: ScanContext, block: bigint, goldKey: number): boolean {
  const dict = readPtr(ctx.reader, block + 8n);
  if (dict == null || !isPlausibleHeapPtr(dict)) return false;
  const goldEntry = dictLookupIntKey(
    ctx.reader,
    dict,
    goldKey,
    MAX_CURRENCY_DICT,
    CURRENCY_DICT_SCAN,
  );
  if (goldEntry == null || !isPlausibleHeapPtr(goldEntry)) return false;
  const gold = readObscuredLong(ctx.reader, goldEntry + BigInt(STRUCT_OBSCURED_QTY));
  return gold != null && plausibleGold(Number(gold));
}

/**
 * Currency manager static store (`uz.tm` / `vb.tp`): a class whose static_fields
 * block holds List<tn> at +0 and Dictionary<int, tn> at +8 with a plausible gold
 * entry for `goldKey`. Matches how bundled TypeInfo RVAs are used at runtime.
 */
export function findCurrencyManagerStatic(
  ctx: ScanContext,
  entries: readonly ClassEntry[],
  goldKey: number,
): { slotRva: bigint } | null {
  for (const entry of entries) {
    const block = ctx.staticBlock(entry.classPtr);
    if (block == null) continue;
    if (!staticBlockHasCurrencyShape(ctx, block)) continue;
    if (!staticBlockPassesGoldProbe(ctx, block, goldKey)) continue;
    return { slotRva: entry.slotRva };
  }
  return null;
}

/**
 * Stage-cache static store (`uz.us` / `vb.uu`): a class whose static_fields block
 * holds a live `StageCache` at +0x88 pointing at `StageInfoData` at +0x10.
 */
export function findStageCacheManagerStatic(
  ctx: ScanContext,
  entries: readonly ClassEntry[],
): { slotRva: bigint; currentCache: number } | null {
  for (const entry of entries) {
    const block = ctx.staticBlock(entry.classPtr);
    if (block == null) continue;
    const cache = readPtr(ctx.reader, block + BigInt(STRUCT_STAGE_CACHE_STATIC_OFF));
    if (cache == null || !isPlausibleHeapPtr(cache)) continue;
    if (!isStageCacheClassName(ctx.instanceClassName(cache))) continue;
    const info = readPtr(ctx.reader, cache + BigInt(STRUCT_CACHE_INFO_DATA));
    if (info == null || !isPlausibleHeapPtr(info)) continue;
    if (ctx.instanceClassName(info) !== "StageInfoData") continue;
    return { slotRva: entry.slotRva, currentCache: STRUCT_STAGE_CACHE_STATIC_OFF };
  }
  return null;
}

/**
 * StageManager singleton: the wrapper class whose static block holds an object
 * whose class declares a `HeroList` field (serialization-stable name). Returns
 * the wrapper's TypeInfo slot RVA plus the derived HeroList instance offset.
 */
export function findStageManager(
  ctx: ScanContext,
  entries: readonly ClassEntry[],
): { slotRva: bigint; heroList: number } | null {
  for (const entry of entries) {
    for (const { value: inst } of ctx.staticSlots(entry.classPtr)) {
      const fields = ctx.instanceClassFields(inst);
      const heroList = fields?.get("HeroList");
      if (heroList != null && heroList > 0) {
        return { slotRva: entry.slotRva, heroList };
      }
    }
  }
  return null;
}

/**
 * StageCacheManager singleton: a static slot pointing at a `StageCache` object
 * whose `+0x10` resolves to a `StageInfoData` (both real class names). Returns
 * the wrapper's slot RVA and the static offset of the current cache.
 */
export function findStageCacheManager(
  ctx: ScanContext,
  entries: readonly ClassEntry[],
): { slotRva: bigint; currentCache: number } | null {
  for (const entry of entries) {
    for (const { soff, value: cache } of ctx.staticSlots(entry.classPtr)) {
      if (!isStageCacheClassName(ctx.instanceClassName(cache))) continue;
      const info = readPtr(ctx.reader, cache + BigInt(STRUCT_CACHE_INFO_DATA));
      if (info == null || !isPlausibleHeapPtr(info)) continue;
      if (ctx.instanceClassName(info) !== "StageInfoData") continue;
      return { slotRva: entry.slotRva, currentCache: soff };
    }
  }
  return null;
}

/** True when `lmPtr` walks like a LogManager holding a GetBoxLog list. */
function isGetBoxLogHolder(ctx: ScanContext, lmPtr: bigint): boolean {
  const dictPtr = readPtr(ctx.reader, lmPtr + BigInt(STRUCT_LOG_BY_TYPE));
  if (dictPtr == null || !isPlausibleHeapPtr(dictPtr)) return false;
  const listPtr = dictLookupIntKey(
    ctx.reader,
    dictPtr,
    STRUCT_GETBOX_TYPE_KEY,
    MAX_LOG_DICT_ENTRIES,
    MAX_LOG_DICT_ENTRIES,
  );
  if (listPtr == null || !isPlausibleHeapPtr(listPtr)) return false;
  const arr = readPtr(ctx.reader, listPtr + BigInt(STRUCT_CONTAINER.listItems));
  const count = readI32(ctx.reader, listPtr + BigInt(STRUCT_CONTAINER.listSize));
  if (arr == null || count == null || count <= 0 || count > MAX_CHEST_LOG) return false;

  // Every sampled entry must be a real GetBoxLog with a valid EMonsterLogType —
  // looser shapes false-positive on unrelated dictionaries (seen live: `<>c`).
  const first = arr + BigInt(STRUCT_CONTAINER.arrayFirst);
  for (let i = 0; i < Math.min(count, LOG_VALIDATE_ENTRIES); i++) {
    const e = readPtr(ctx.reader, first + BigInt(i * 8));
    if (e == null || !isPlausibleHeapPtr(e)) return false;
    if (ctx.instanceClassName(e) !== "GetBoxLog") return false;
    const mt = readI32(ctx.reader, e + BigInt(STRUCT_GETBOX_MONSTER_TYPE));
    if (mt == null || mt < 0 || mt > 2) return false;
  }
  return true;
}

/**
 * LogManager singleton (chest-drop log): a static slot pointing at an object
 * whose `+0x28` dictionary maps ELogType.GetBox to a list of `GetBoxLog`
 * entries. Requires at least one logged drop to validate — retried on later
 * launches while the offset table stays incomplete.
 */
export function findLogManager(
  ctx: ScanContext,
  entries: readonly ClassEntry[],
): { slotRva: bigint } | null {
  for (const entry of entries) {
    for (const { value: inst } of ctx.staticSlots(entry.classPtr)) {
      if (isGetBoxLogHolder(ctx, inst)) return { slotRva: entry.slotRva };
    }
  }
  return null;
}

/**
 * Currency manager singleton fallback: statics hold a List at +0 and a
 * `Dictionary<int, T>` at +8 whose `goldKey` entry decodes to plausible gold.
 */
export function findCurrencyManager(
  ctx: ScanContext,
  entries: readonly ClassEntry[],
  goldKey: number,
): { slotRva: bigint } | null {
  for (const entry of entries) {
    const sb = ctx.staticBlock(entry.classPtr);
    if (sb == null) continue;
    const list = readPtr(ctx.reader, sb);
    const dict = readPtr(ctx.reader, sb + BigInt(STRUCT_CURRENCY_DICT));
    if (list == null || !isPlausibleHeapPtr(list)) continue;
    if (dict == null || !isPlausibleHeapPtr(dict)) continue;
    const goldEntry = dictLookupIntKey(
      ctx.reader,
      dict,
      goldKey,
      MAX_CURRENCY_DICT,
      CURRENCY_DICT_SCAN,
    );
    if (goldEntry == null || !isPlausibleHeapPtr(goldEntry)) continue;
    const gold = readObscuredLong(ctx.reader, goldEntry + BigInt(STRUCT_OBSCURED_QTY));
    if (gold != null && plausibleGold(Number(gold))) {
      return { slotRva: entry.slotRva };
    }
  }
  return null;
}

const MAX_SAVE_LIST = 100_000;

/** Offset of the first instance field holding a `List<elementClassName>`. */
function findListField(ctx: ScanContext, obj: bigint, elementClassName: string): number | null {
  for (let foff = 0x10; foff <= INSTANCE_SCAN_MAX; foff += 8) {
    const listPtr = readPtr(ctx.reader, obj + BigInt(foff));
    if (listPtr == null || !isPlausibleHeapPtr(listPtr)) continue;
    const arr = readPtr(ctx.reader, listPtr + BigInt(STRUCT_CONTAINER.listItems));
    if (arr == null || !isPlausibleHeapPtr(arr)) continue;
    const count = readI32(ctx.reader, listPtr + BigInt(STRUCT_CONTAINER.listSize));
    if (count == null || count <= 0 || count > MAX_SAVE_LIST) continue;
    const e0 = readPtr(ctx.reader, arr + BigInt(STRUCT_CONTAINER.arrayFirst));
    if (e0 == null || ctx.instanceClassName(e0) !== elementClassName) continue;
    return foff;
  }
  return null;
}

export interface PlayerAnchor {
  /** TypeInfo slot RVA of the class whose static block holds the player object. */
  commonSaveData: bigint;
  /** Offset of the player object within that static block. */
  playerStaticOff: number;
  petSaveDatas: number;
  itemSaveDatas: number;
  petKey: number;
  petIsUnlock: number;
  itemKey: number;
  itemIsChaotic: number;
}

/** Field offset from a named class in the index (0 when class/field is absent). */
function namedClassField(
  ctx: ScanContext,
  entries: readonly ClassEntry[],
  className: string,
  fieldName: string,
): number {
  for (const entry of entries) {
    if (entry.name !== className) continue;
    const off = ctx.classFields(entry.classPtr)?.get(fieldName);
    if (off != null && off > 0) return off;
  }
  return 0;
}

/**
 * Player save-data anchor (pets + inventory): a static slot pointing at an
 * object that carries the save lists — identified by the serialization-stable
 * field names (`PetSaveData`, `itemSaveDatas`) or, failing that, by hunting for
 * a `List<PetSaveData>` / `List<ItemSaveData>` among its raw instance fields.
 * Element struct offsets come from the `PetSaveData` / `ItemSaveData` classes.
 * Not resolvable on v1.00.23 (save objects are not static-reachable at
 * runtime) — pets/inventory then degrade to save-file data.
 */
export function findPlayerSaveData(
  ctx: ScanContext,
  entries: readonly ClassEntry[],
): PlayerAnchor | null {
  for (const entry of entries) {
    for (const { soff, value: obj } of ctx.staticSlots(entry.classPtr)) {
      const fields = ctx.instanceClassFields(obj);
      if (fields == null) continue;
      let petsOff = fields.get("PetSaveData") ?? 0;
      let itemsOff = fields.get("itemSaveDatas") ?? 0;
      if (petsOff <= 0) petsOff = findListField(ctx, obj, "PetSaveData") ?? 0;
      if (itemsOff <= 0) itemsOff = findListField(ctx, obj, "ItemSaveData") ?? 0;
      if (petsOff <= 0 && itemsOff <= 0) continue;

      return {
        commonSaveData: entry.slotRva,
        playerStaticOff: soff,
        petSaveDatas: petsOff,
        itemSaveDatas: itemsOff,
        petKey: namedClassField(ctx, entries, "PetSaveData", "PetKey"),
        petIsUnlock: namedClassField(ctx, entries, "PetSaveData", "IsUnlock"),
        itemKey: namedClassField(ctx, entries, "ItemSaveData", "ItemKey"),
        itemIsChaotic: namedClassField(ctx, entries, "ItemSaveData", "IsChaotic"),
      };
    }
  }
  return null;
}
