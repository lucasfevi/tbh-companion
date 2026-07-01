// IL2CPP static-field resolution via ScriptMetadata TypeInfo RVAs — pure.
// Given a MemoryReader + GameAssembly base/size, resolve Il2CppClass* and its
// static_fields block, then read a pointer field within it.

import { readPtr, type MemoryReader } from "./memory";

function isPlausibleHeapPtr(p: bigint): boolean {
  return p > 0x10000n && p < 0x7ff0_0000_0000n;
}

function isPlausibleClassPtr(p: bigint, gaBase: bigint, gaSize: number): boolean {
  return isPlausibleHeapPtr(p) || (p >= gaBase && p < gaBase + BigInt(gaSize));
}

/** Resolve `Il2CppClass*` from a ScriptMetadata TypeInfo slot. */
export function resolveClassPtr(
  reader: MemoryReader,
  gaBase: bigint,
  gaSize: number,
  typeInfoRva: bigint,
): bigint | null {
  const slot = gaBase + typeInfoRva;
  const fromSlot = readPtr(reader, slot);
  if (fromSlot != null && isPlausibleClassPtr(fromSlot, gaBase, gaSize)) return fromSlot;
  if (isPlausibleClassPtr(slot, gaBase, gaSize)) return slot;
  return fromSlot;
}

/** Read the static_fields block (tries known Il2CppClass layout offsets). */
export function readStaticFieldsBlock(
  reader: MemoryReader,
  gaBase: bigint,
  gaSize: number,
  typeInfoRva: bigint,
  staticFieldsCandidates: readonly number[],
): bigint | null {
  const classPtr = resolveClassPtr(reader, gaBase, gaSize, typeInfoRva);
  if (classPtr == null) return null;
  for (const off of staticFieldsCandidates) {
    const block = readPtr(reader, classPtr + BigInt(off));
    if (block != null && isPlausibleHeapPtr(block)) return block;
  }
  return null;
}

/** Read a pointer inside a static-fields struct at the given field offset. */
export function readStaticFieldPtr(
  reader: MemoryReader,
  gaBase: bigint,
  gaSize: number,
  typeInfoRva: bigint,
  fieldOffset: number,
  staticFieldsCandidates: readonly number[],
): bigint | null {
  const block = readStaticFieldsBlock(reader, gaBase, gaSize, typeInfoRva, staticFieldsCandidates);
  if (block == null) return null;
  return readPtr(reader, block + BigInt(fieldOffset));
}
