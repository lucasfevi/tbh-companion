// Pure primitive readers over an injected MemoryReader.
//
// The live-memory read algorithms live in core so they can be unit-tested over
// synthetic memory maps. The impure koffi/ReadProcessMemory backing implements
// MemoryReader in the utilityProcess worker. No node/electron/koffi imports here.

/** Minimal read-only view of a process's address space. */
export interface MemoryReader {
  /** Read `size` bytes at `addr`, or null if the region is unreadable. */
  readBytes(addr: bigint, size: number): Buffer | null;
}

/** Read a 64-bit pointer; null for short reads or implausibly-low values (< 0x10000). */
export function readPtr(reader: MemoryReader, addr: bigint): bigint | null {
  const b = reader.readBytes(addr, 8);
  if (!b || b.length < 8) return null;
  const v = b.readBigUInt64LE(0);
  return v < 0x10000n ? null : v;
}

/** Read a signed 32-bit int; null for short reads. */
export function readI32(reader: MemoryReader, addr: bigint): number | null {
  const b = reader.readBytes(addr, 4);
  return b && b.length >= 4 ? b.readInt32LE(0) : null;
}

/** Read a 32-bit float; null for short reads. */
export function readF32(reader: MemoryReader, addr: bigint): number | null {
  const b = reader.readBytes(addr, 4);
  return b && b.length >= 4 ? b.readFloatLE(0) : null;
}
