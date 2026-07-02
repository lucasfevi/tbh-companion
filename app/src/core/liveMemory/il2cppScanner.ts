// Pure IL2CPP class/field scanner — used by the runtime offset extractor.
// Injects MemoryReader so it is unit-testable over FakeMemory.
// No node / electron / koffi imports.

import { readI32, readPtr, type MemoryReader } from "./memory";

// ── Constants ─────────────────────────────────────────────────────────────────

const IL2CPP_CLASS_NAME_OFFSET = 0x10n; // Il2CppClass.name: char*
const IL2CPP_CLASS_FIELDS_OFFSET = 0x80n; // Il2CppClass.fields: Il2CppFieldInfo*
const IL2CPP_CLASS_FIELDS_ALT_OFFSET = 0x88n; // fallback when 0x80 yields null
const IL2CPP_FIELD_INFO_SIZE = 0x20; // sizeof(Il2CppFieldInfo) — x64
const IL2CPP_FIELD_NAME_OFFSET = 0x0n; // Il2CppFieldInfo.name: char*
const IL2CPP_FIELD_OFFSET_OFFSET = 0x18n; // Il2CppFieldInfo.offset: int32
const MAX_CLASS_NAME_LEN = 128;
const MAX_FIELDS = 200;

// ── Helpers ────────────────────────────────────────────────────────────────────

function isPlausibleHeapPtr(v: bigint): boolean {
  return v > 0x10000n && v < 0x7ff0_0000_0000n;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Read a null-terminated ASCII/UTF-8 C string at `ptr`.
 * Returns null if:
 *  - ptr is implausible (< 0x10000)
 *  - the first readable byte is not a printable ASCII character (0x20–0x7e)
 *  - the memory is unreadable
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
  // First byte must be printable ASCII (class/field names start with a letter or digit).
  const first = buf[0];
  if (first < 0x20 || first > 0x7e) return null;
  const end = buf.indexOf(0);
  return buf.subarray(0, end === -1 ? buf.length : end).toString("utf8");
}

/**
 * Scan 8-byte-aligned slots in [regionBase, regionBase + regionSize) for one whose
 * dereferenced value looks like an `Il2CppClass*` with `name == targetName`.
 *
 * Returns `{ slotRva: bigint, classPtr: bigint }` where `slotRva = slot - gaBase`
 * (the value stored in `LiveOffsets.typeInfoRva.*`), or null if not found.
 */
export function scanForClass(
  reader: MemoryReader,
  gaBase: bigint,
  regionBase: bigint,
  regionSize: number,
  targetName: string,
): { slotRva: bigint; classPtr: bigint } | null {
  const end = regionBase + BigInt(regionSize);
  for (let slot = regionBase; slot + 8n <= end; slot += 8n) {
    const classPtr = readPtr(reader, slot);
    if (classPtr == null || !isPlausibleHeapPtr(classPtr)) continue;
    const namePtr = readPtr(reader, classPtr + IL2CPP_CLASS_NAME_OFFSET);
    if (namePtr == null) continue;
    const name = readCString(reader, namePtr);
    if (name === targetName) {
      return { slotRva: slot - gaBase, classPtr };
    }
  }
  return null;
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

/**
 * From a list of candidate `{ slotRva, classPtr }` entries, find the obfuscated
 * currency-manager class by its static-field structural shape:
 *  - static_fields[+0x0] is a valid heap pointer (List<T>)
 *  - static_fields[+0x8] is a valid heap pointer (Dictionary<int, T>)
 *
 * Returns the TypeInfo slot RVA of the matching class, or null when none found.
 */
export function resolveStructuralCurrencyManager(
  reader: MemoryReader,
  _gaBase: bigint,
  candidates: ReadonlyArray<{ slotRva: bigint; classPtr: bigint }>,
  staticFieldsCandidates: readonly number[],
): bigint | null {
  for (const { slotRva, classPtr } of candidates) {
    // Find the static_fields block (try each candidate offset).
    let staticFieldsPtr: bigint | null = null;
    for (const off of staticFieldsCandidates) {
      const p = readPtr(reader, classPtr + BigInt(off));
      if (p != null && isPlausibleHeapPtr(p)) {
        staticFieldsPtr = p;
        break;
      }
    }
    if (staticFieldsPtr == null) continue;

    // Structural check: two valid heap pointers at offsets 0 and 8 within static_fields.
    const listPtr = readPtr(reader, staticFieldsPtr);
    const dictPtr = readPtr(reader, staticFieldsPtr + 8n);
    if (
      listPtr != null &&
      isPlausibleHeapPtr(listPtr) &&
      dictPtr != null &&
      isPlausibleHeapPtr(dictPtr)
    ) {
      return slotRva;
    }
  }
  return null;
}
