// Shared test double: a synthetic address space implementing MemoryReader.
// Not a test file (no .test suffix) — imported by the core liveMemory tests.

import type { MemoryReader } from "../../src/core/liveMemory/memory";

/** A sparse fake memory keyed by exact address; each seeded slot holds its own buffer. */
export class FakeMemory implements MemoryReader {
  private readonly words = new Map<string, Buffer>();

  writePtr(addr: bigint, value: bigint): this {
    const b = Buffer.alloc(8);
    b.writeBigUInt64LE(value & 0xffffffffffffffffn, 0);
    this.words.set(addr.toString(), b);
    return this;
  }

  writeI32(addr: bigint, value: number): this {
    const b = Buffer.alloc(4);
    b.writeInt32LE(value, 0);
    this.words.set(addr.toString(), b);
    return this;
  }

  writeF32(addr: bigint, value: number): this {
    const b = Buffer.alloc(4);
    b.writeFloatLE(value, 0);
    this.words.set(addr.toString(), b);
    return this;
  }

  writeBytes(addr: bigint, buf: Buffer): this {
    this.words.set(addr.toString(), buf);
    return this;
  }

  readBytes(addr: bigint, size: number): Buffer | null {
    const b = this.words.get(addr.toString());
    if (!b || b.length < size) return null;
    return b.subarray(0, size);
  }
}
