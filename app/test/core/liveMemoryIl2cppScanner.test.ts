import { describe, it, expect } from "vitest";
import {
  readCString,
  scanForClass,
  readClassFields,
  resolveStructuralCurrencyManager,
} from "../../src/core/liveMemory/il2cppScanner";
import { FakeMemory } from "./liveMemoryFake";

// ── Helpers ────────────────────────────────────────────────────────────────────

const GA_BASE = 0x140000000n;

/** Write a null-terminated string to FakeMemory at `addr`.
 *  Always pads to at least 128 bytes so readCString's maxLen=128 readBytes call succeeds. */
function writeString(m: FakeMemory, addr: bigint, s: string, minLen = 128): void {
  const b = Buffer.alloc(Math.max(s.length + 1, minLen), 0);
  b.write(s, 0, "utf8");
  m.writeBytes(addr, b);
}

/** Seed a minimal Il2CppClass* at `classPtr` with the given name. */
function seedClass(m: FakeMemory, slot: bigint, classPtr: bigint, name: string): void {
  m.writePtr(slot, classPtr);
  const nameAddr = classPtr + 0x200n;
  writeString(m, nameAddr, name);
  m.writePtr(classPtr + 0x10n, nameAddr); // Il2CppClass.name
}

/** Seed Il2CppFieldInfo entries at `fieldsPtr` off classPtr+0x80. */
function seedFields(
  m: FakeMemory,
  classPtr: bigint,
  fields: Array<{ name: string; offset: number }>,
): void {
  const fieldsPtr = classPtr + 0x1000n;
  m.writePtr(classPtr + 0x80n, fieldsPtr); // Il2CppClass.fields
  for (let i = 0; i < fields.length; i++) {
    const base = fieldsPtr + BigInt(i * 0x20);
    const nameAddr = fieldsPtr + 0x1000n + BigInt(i * 0x100);
    writeString(m, nameAddr, fields[i].name);
    m.writePtr(base, nameAddr); // name
    m.writeI32(base + 0x18n, fields[i].offset); // offset
  }
  // sentinel: null name ptr at next entry
  const sentinelBase = fieldsPtr + BigInt(fields.length * 0x20);
  m.writePtr(sentinelBase, 0n); // null name ptr → stop
}

// ── readCString ────────────────────────────────────────────────────────────────

describe("readCString", () => {
  it("reads a null-terminated ASCII string", () => {
    const m = new FakeMemory();
    writeString(m, 0x500000n, "StageManager");
    expect(readCString(m, 0x500000n)).toBe("StageManager");
  });

  it("returns null for a pointer below 0x10000 (implausible)", () => {
    const m = new FakeMemory();
    expect(readCString(m, 0x1000n)).toBeNull();
  });

  it("returns null when the first byte is a non-printable character (NUL / control)", () => {
    const m = new FakeMemory();
    const buf = Buffer.alloc(8, 0); // all zeros
    m.writeBytes(0x500000n, buf);
    expect(readCString(m, 0x500000n)).toBeNull();
  });

  it("returns null when the memory region is unreadable (empty FakeMemory)", () => {
    expect(readCString(new FakeMemory(), 0x500000n)).toBeNull();
  });

  it("truncates at maxLen without crashing", () => {
    const m = new FakeMemory();
    // 128 bytes of printable ASCII, no null terminator → readCString returns all 128 chars
    const buf = Buffer.alloc(128, 0x41); // 'A' * 128
    m.writeBytes(0x500000n, buf);
    const result = readCString(m, 0x500000n, 128);
    expect(result).toHaveLength(128);
  });
});

// ── scanForClass ──────────────────────────────────────────────────────────────

describe("scanForClass", () => {
  it("finds a class by name in the region and returns the slot RVA and classPtr", () => {
    const m = new FakeMemory();
    const slot = GA_BASE + 0x5000n;
    const classPtr = 0x7ff000000n;
    seedClass(m, slot, classPtr, "StageManager");

    const regionBase = GA_BASE + 0x4000n;
    const regionSize = 0x2000;
    const result = scanForClass(m, GA_BASE, regionBase, regionSize, "StageManager");
    expect(result).not.toBeNull();
    expect(result!.slotRva).toBe(slot - GA_BASE);
    expect(result!.classPtr).toBe(classPtr);
  });

  it("returns null when no class in the region matches the target name", () => {
    const m = new FakeMemory();
    const slot = GA_BASE + 0x5000n;
    const classPtr = 0x7ff000000n;
    seedClass(m, slot, classPtr, "SomeOtherClass");

    const result = scanForClass(m, GA_BASE, GA_BASE + 0x4000n, 0x2000, "StageManager");
    expect(result).toBeNull();
  });

  it("returns null for an empty / unreadable region", () => {
    const result = scanForClass(new FakeMemory(), GA_BASE, GA_BASE + 0x1000n, 0x1000, "Foo");
    expect(result).toBeNull();
  });

  it("skips slots whose dereferenced value is a low/invalid pointer", () => {
    const m = new FakeMemory();
    // Seed a slot with a low pointer (< 0x10000 → not a valid class)
    m.writePtr(GA_BASE + 0x8000n, 0x1234n);
    const result = scanForClass(m, GA_BASE, GA_BASE + 0x7ff8n, 0x10, "StageManager");
    expect(result).toBeNull();
  });
});

// ── readClassFields ───────────────────────────────────────────────────────────

describe("readClassFields", () => {
  it("returns a map of field name → instance offset", () => {
    const m = new FakeMemory();
    const classPtr = 0x7ff000100n;
    seedFields(m, classPtr, [
      { name: "HeroList", offset: 0x30 },
      { name: "boxCount", offset: 0xf8 },
    ]);

    const result = readClassFields(m, classPtr);
    expect(result).not.toBeNull();
    expect(result!.get("HeroList")).toBe(0x30);
    expect(result!.get("boxCount")).toBe(0xf8);
  });

  it("returns null when both fields-pointer candidates are unreadable", () => {
    // classPtr seeded but no fields pointer seeded → both reads return null
    expect(readClassFields(new FakeMemory(), 0x7ff000100n)).toBeNull();
  });

  it("falls back to +0x88 when +0x80 yields null", () => {
    const m = new FakeMemory();
    const classPtr = 0x7ff000200n;
    const fieldsPtr = classPtr + 0x1000n;
    // Seed at +0x88 instead of +0x80
    m.writePtr(classPtr + 0x88n, fieldsPtr);
    const nameAddr = fieldsPtr + 0x1000n;
    writeString(m, nameAddr, "someField");
    m.writePtr(fieldsPtr, nameAddr);
    m.writeI32(fieldsPtr + 0x18n, 0x40);
    // sentinel
    m.writePtr(fieldsPtr + 0x20n, 0n);

    const result = readClassFields(m, classPtr);
    expect(result).not.toBeNull();
    expect(result!.get("someField")).toBe(0x40);
  });

  it("stops at a null name pointer (end-of-array sentinel)", () => {
    const m = new FakeMemory();
    const classPtr = 0x7ff000300n;
    seedFields(m, classPtr, [{ name: "OnlyField", offset: 0x10 }]);

    const result = readClassFields(m, classPtr);
    expect(result).not.toBeNull();
    expect(result!.size).toBe(1);
  });
});

// ── resolveStructuralCurrencyManager ─────────────────────────────────────────

const STATIC_CANDIDATES = [0xb0, 0xb8, 0xa8] as const;

describe("resolveStructuralCurrencyManager", () => {
  function seedCurrencyManagerCandidate(
    m: FakeMemory,
    slot: bigint,
    classPtr: bigint,
  ): void {
    m.writePtr(slot, classPtr);
    // static_fields at classPtr+0xb0 → block with list@+0 and dict@+8
    const staticBlock = 0x8010000n;
    m.writePtr(classPtr + 0xb0n, staticBlock);
    m.writePtr(staticBlock, 0x9000000n); // List<T> ptr
    m.writePtr(staticBlock + 8n, 0x9100000n); // Dict<int,T> ptr
  }

  it("returns the slotRva when a candidate has matching static block shape", () => {
    const m = new FakeMemory();
    const slot = GA_BASE + 0x1000n;
    const classPtr = 0x8000000n;
    seedCurrencyManagerCandidate(m, slot, classPtr);

    const result = resolveStructuralCurrencyManager(
      m,
      GA_BASE,
      [{ slotRva: slot - GA_BASE, classPtr }],
      STATIC_CANDIDATES,
    );
    expect(result).toBe(slot - GA_BASE);
  });

  it("returns null when the static block does not have two valid heap pointers", () => {
    const m = new FakeMemory();
    const slot = GA_BASE + 0x2000n;
    const classPtr = 0x8100000n;
    m.writePtr(slot, classPtr);
    // static_fields block with only one valid pointer (dict is 0)
    const staticBlock = 0x8200000n;
    m.writePtr(classPtr + 0xb0n, staticBlock);
    m.writePtr(staticBlock, 0x9000000n); // list ok
    m.writePtr(staticBlock + 8n, 0n); // dict null → fails structural check

    const result = resolveStructuralCurrencyManager(
      m,
      GA_BASE,
      [{ slotRva: slot - GA_BASE, classPtr }],
      STATIC_CANDIDATES,
    );
    expect(result).toBeNull();
  });

  it("returns null for an empty candidate list", () => {
    const result = resolveStructuralCurrencyManager(new FakeMemory(), GA_BASE, [], STATIC_CANDIDATES);
    expect(result).toBeNull();
  });

  it("skips candidates without a readable static_fields block and finds the correct one", () => {
    const m = new FakeMemory();
    const badSlot = GA_BASE + 0x3000n;
    const badClassPtr = 0x8300000n;
    m.writePtr(badSlot, badClassPtr);
    // no static_fields seeded for bad candidate

    const goodSlot = GA_BASE + 0x4000n;
    const goodClassPtr = 0x8400000n;
    seedCurrencyManagerCandidate(m, goodSlot, goodClassPtr);

    const result = resolveStructuralCurrencyManager(
      m,
      GA_BASE,
      [
        { slotRva: badSlot - GA_BASE, classPtr: badClassPtr },
        { slotRva: goodSlot - GA_BASE, classPtr: goodClassPtr },
      ],
      STATIC_CANDIDATES,
    );
    expect(result).toBe(goodSlot - GA_BASE);
  });
});
