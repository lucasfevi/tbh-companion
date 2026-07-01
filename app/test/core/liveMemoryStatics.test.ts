import { describe, it, expect } from "vitest";
import { readPtr, readI32, readF32 } from "../../src/core/liveMemory/memory";
import {
  resolveClassPtr,
  readStaticFieldsBlock,
  readStaticFieldPtr,
} from "../../src/core/liveMemory/statics";
import { FakeMemory } from "./liveMemoryFake";

const GA_BASE = 0x140000000n;
const GA_SIZE = 0x6000000;
const RVA = 0x5dc9958n; // < GA_SIZE ⇒ slot lies inside GameAssembly
const SLOT = GA_BASE + RVA;
const CLASS_PTR = 0x200000n;
const BLOCK = 0x300000n;
const TARGET = 0x400000n;
const CANDIDATES = [0xb0, 0xb8, 0xa8] as const;

describe("memory primitive readers", () => {
  it("readPtr returns a plausible pointer and null for low/short values", () => {
    const m = new FakeMemory().writePtr(0x1000n, CLASS_PTR).writePtr(0x2000n, 0x100n);
    expect(readPtr(m, 0x1000n)).toBe(CLASS_PTR);
    expect(readPtr(m, 0x2000n)).toBeNull(); // value < 0x10000 rejected
    expect(readPtr(m, 0x9999n)).toBeNull(); // unseeded ⇒ short read
  });

  it("readI32 reads signed ints, null when unreadable", () => {
    const m = new FakeMemory().writeI32(0x1000n, -42).writeI32(0x1004n, 123);
    expect(readI32(m, 0x1000n)).toBe(-42);
    expect(readI32(m, 0x1004n)).toBe(123);
    expect(readI32(m, 0x9999n)).toBeNull();
  });

  it("readF32 reads floats, null when unreadable", () => {
    const m = new FakeMemory().writeF32(0x1000n, 1.5);
    expect(readF32(m, 0x1000n)).toBeCloseTo(1.5);
    expect(readF32(m, 0x9999n)).toBeNull();
  });
});

describe("static-field resolution", () => {
  it("resolves class → static_fields block → field pointer (full chain)", () => {
    const m = new FakeMemory()
      .writePtr(SLOT, CLASS_PTR)
      .writePtr(CLASS_PTR + 0xb0n, BLOCK)
      .writePtr(BLOCK + 0x8n, TARGET);

    expect(resolveClassPtr(m, GA_BASE, GA_SIZE, RVA)).toBe(CLASS_PTR);
    expect(readStaticFieldsBlock(m, GA_BASE, GA_SIZE, RVA, CANDIDATES)).toBe(BLOCK);
    expect(readStaticFieldPtr(m, GA_BASE, GA_SIZE, RVA, 0x8, CANDIDATES)).toBe(TARGET);
  });

  it("tries later static-field candidate offsets when the first is empty", () => {
    // Only the 2nd candidate (0xb8) holds the block.
    const m = new FakeMemory().writePtr(SLOT, CLASS_PTR).writePtr(CLASS_PTR + 0xb8n, BLOCK);
    expect(readStaticFieldsBlock(m, GA_BASE, GA_SIZE, RVA, CANDIDATES)).toBe(BLOCK);
  });

  it("falls back to the slot address when the slot holds no plausible class pointer", () => {
    // slot stores a low value ⇒ readPtr null; slot address itself lies in GameAssembly.
    const m = new FakeMemory().writePtr(SLOT, 0x100n);
    expect(resolveClassPtr(m, GA_BASE, GA_SIZE, RVA)).toBe(SLOT);
  });

  it("returns null (never a wrong value) when the chain is broken", () => {
    const m = new FakeMemory().writePtr(SLOT, CLASS_PTR); // no static_fields seeded
    expect(readStaticFieldsBlock(m, GA_BASE, GA_SIZE, RVA, CANDIDATES)).toBeNull();
    expect(readStaticFieldPtr(m, GA_BASE, GA_SIZE, RVA, 0x8, CANDIDATES)).toBeNull();
  });
});
