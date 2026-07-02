import { describe, it, expect } from "vitest";
import {
  collectClassEntries,
  findCurrencyManager,
  findLogManager,
  findPlayerSaveData,
  findStageCacheManager,
  findStageCacheManagerStatic,
  findStageManager,
  readCString,
  readClassFields,
  ScanContext,
  type ClassEntry,
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

/** Seed a minimal named Il2CppClass* at `classPtr` (name string at classPtr+0x200). */
function seedClass(m: FakeMemory, classPtr: bigint, name: string): void {
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
  m.writePtr(fieldsPtr + BigInt(fields.length * 0x20), 0n);
}

/** Seed a static_fields block at classPtr+0xb0 and return its address. */
function seedStaticBlock(m: FakeMemory, classPtr: bigint, blockAddr: bigint): bigint {
  m.writePtr(classPtr + 0xb0n, blockAddr);
  return blockAddr;
}

/** Give an object instance a class header (`*obj` = Il2CppClass*). */
function seedInstance(m: FakeMemory, objPtr: bigint, classPtr: bigint): void {
  m.writePtr(objPtr, classPtr);
}

/** A hand-built index entry (detector tests skip the region scan). */
function entry(m: FakeMemory, classPtr: bigint, slotRva: bigint, name: string): ClassEntry {
  seedClass(m, classPtr, name);
  return { classPtr, slotRva, name };
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

  it("returns null when the string is empty (leading NUL)", () => {
    const m = new FakeMemory();
    m.writeBytes(0x500000n, Buffer.alloc(8, 0));
    expect(readCString(m, 0x500000n)).toBeNull();
  });

  it("returns null when the string contains non-printable characters", () => {
    const m = new FakeMemory();
    const buf = Buffer.alloc(128, 0);
    buf.write("Stage", 0, "utf8");
    buf[5] = 0x01; // control character inside the name
    buf.write("Manager", 6, "utf8");
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
    expect(readClassFields(new FakeMemory(), 0x7ff000100n)).toBeNull();
  });

  it("falls back to +0x88 when +0x80 yields null", () => {
    const m = new FakeMemory();
    const classPtr = 0x7ff000200n;
    const fieldsPtr = classPtr + 0x1000n;
    m.writePtr(classPtr + 0x88n, fieldsPtr);
    const nameAddr = fieldsPtr + 0x1000n;
    writeString(m, nameAddr, "someField");
    m.writePtr(fieldsPtr, nameAddr);
    m.writeI32(fieldsPtr + 0x18n, 0x40);
    m.writePtr(fieldsPtr + 0x20n, 0n); // sentinel

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

// ── collectClassEntries ───────────────────────────────────────────────────────

describe("collectClassEntries", () => {
  it("indexes named classes from region slots and records their slot RVAs", () => {
    const m = new FakeMemory();
    const classA = 0x7ff000000n;
    const classB = 0x7ff100000n;
    seedClass(m, classA, "StageCache");
    seedClass(m, classB, "GetBoxLog");

    // Region buffer: [garbage, classA, low value, classB]
    const regionBase = GA_BASE + 0x1000n;
    const buf = Buffer.alloc(32);
    buf.writeBigUInt64LE(0xdeadbeefdeadbeefn, 0); // implausible (> 0x7ff0...)
    buf.writeBigUInt64LE(classA, 8);
    buf.writeBigUInt64LE(0x10n, 16); // below plausible range
    buf.writeBigUInt64LE(classB, 24);
    m.writeBytes(regionBase, buf);

    const ctx = new ScanContext(m);
    const { entries, stats } = collectClassEntries(ctx, GA_BASE, [{ base: regionBase, size: 32 }]);

    expect(stats.slotsScanned).toBe(4);
    expect(entries).toHaveLength(2);
    expect(entries.find((e) => e.name === "StageCache")?.slotRva).toBe(0x1008n);
    expect(entries.find((e) => e.name === "GetBoxLog")?.slotRva).toBe(0x1018n);
  });

  it("dedupes repeated class pointers, keeping the first slot", () => {
    const m = new FakeMemory();
    const classA = 0x7ff000000n;
    seedClass(m, classA, "StageCache");
    const regionBase = GA_BASE + 0x2000n;
    const buf = Buffer.alloc(16);
    buf.writeBigUInt64LE(classA, 0);
    buf.writeBigUInt64LE(classA, 8);
    m.writeBytes(regionBase, buf);

    const ctx = new ScanContext(m);
    const { entries } = collectClassEntries(ctx, GA_BASE, [{ base: regionBase, size: 16 }]);
    expect(entries).toHaveLength(1);
    expect(entries[0].slotRva).toBe(0x2000n);
  });

  it("reads regions in chunks (slot RVAs stay correct across chunk boundaries)", () => {
    const m = new FakeMemory();
    const classA = 0x7ff000000n;
    const classB = 0x7ff100000n;
    seedClass(m, classA, "First");
    seedClass(m, classB, "Second");

    const regionBase = GA_BASE + 0x3000n;
    const chunk1 = Buffer.alloc(16);
    chunk1.writeBigUInt64LE(classA, 0);
    const chunk2 = Buffer.alloc(16);
    chunk2.writeBigUInt64LE(classB, 8);
    m.writeBytes(regionBase, chunk1);
    m.writeBytes(regionBase + 16n, chunk2);

    const ctx = new ScanContext(m);
    const { entries } = collectClassEntries(
      ctx,
      GA_BASE,
      [{ base: regionBase, size: 32 }],
      16, // chunkSize
    );
    expect(entries.find((e) => e.name === "First")?.slotRva).toBe(0x3000n);
    expect(entries.find((e) => e.name === "Second")?.slotRva).toBe(0x3018n);
  });

  it("skips unreadable regions", () => {
    const ctx = new ScanContext(new FakeMemory());
    const { entries, stats } = collectClassEntries(ctx, GA_BASE, [
      { base: GA_BASE + 0x1000n, size: 64 },
    ]);
    expect(entries).toHaveLength(0);
    expect(stats.slotsScanned).toBe(0);
  });
});

// ── findStageManager ──────────────────────────────────────────────────────────

describe("findStageManager", () => {
  it("finds the wrapper whose static slot holds an instance with a HeroList field", () => {
    const m = new FakeMemory();
    const wrapper = 0x7ff200000n;
    const smClass = 0x7ff210000n;
    const smInst = 0x7ff220000n;

    const e = entry(m, wrapper, 0x5000n, "nq`1");
    const block = seedStaticBlock(m, wrapper, 0x7ff230000n);
    m.writePtr(block + 0x20n, smInst);
    seedInstance(m, smInst, smClass);
    seedClass(m, smClass, "StageManager");
    seedFields(m, smClass, [{ name: "HeroList", offset: 0x30 }]);

    const result = findStageManager(new ScanContext(m), [e]);
    expect(result).toEqual({ slotRva: 0x5000n, heroList: 0x30 });
  });

  it("returns null when no static instance has a HeroList field", () => {
    const m = new FakeMemory();
    const wrapper = 0x7ff200000n;
    const someClass = 0x7ff210000n;
    const inst = 0x7ff220000n;

    const e = entry(m, wrapper, 0x5000n, "nq`1");
    const block = seedStaticBlock(m, wrapper, 0x7ff230000n);
    m.writePtr(block, inst);
    seedInstance(m, inst, someClass);
    seedClass(m, someClass, "SomethingElse");
    seedFields(m, someClass, [{ name: "otherField", offset: 0x18 }]);

    expect(findStageManager(new ScanContext(m), [e])).toBeNull();
  });
});

// ── findStageCacheManager ─────────────────────────────────────────────────────

describe("findStageCacheManager", () => {
  function seedStageCacheHolder(m: FakeMemory, opts: { infoClassName: string }): ClassEntry {
    const wrapper = 0x7ff300000n;
    const cacheClass = 0x7ff310000n;
    const infoClass = 0x7ff320000n;
    const cacheInst = 0x7ff330000n;
    const infoInst = 0x7ff340000n;

    const e = entry(m, wrapper, 0x6000n, "uu");
    const block = seedStaticBlock(m, wrapper, 0x7ff350000n);
    m.writePtr(block + 0x88n, cacheInst);
    seedInstance(m, cacheInst, cacheClass);
    seedClass(m, cacheClass, "StageCache");
    m.writePtr(cacheInst + 0x10n, infoInst);
    seedInstance(m, infoInst, infoClass);
    seedClass(m, infoClass, opts.infoClassName);
    return e;
  }

  it("finds the static slot pointing at StageCache → StageInfoData", () => {
    const m = new FakeMemory();
    const e = seedStageCacheHolder(m, { infoClassName: "StageInfoData" });
    const result = findStageCacheManager(new ScanContext(m), [e]);
    expect(result).toEqual({ slotRva: 0x6000n, currentCache: 0x88 });
  });

  it("accepts vb.StageCache as the cache instance class name (v1.00.23)", () => {
    const m = new FakeMemory();
    const wrapper = 0x7ff300000n;
    const cacheClass = 0x7ff310000n;
    const infoClass = 0x7ff320000n;
    const cacheInst = 0x7ff330000n;
    const infoInst = 0x7ff340000n;

    const e = entry(m, wrapper, 0x6000n, "uu");
    const block = seedStaticBlock(m, wrapper, 0x7ff350000n);
    m.writePtr(block + 0x88n, cacheInst);
    seedInstance(m, cacheInst, cacheClass);
    seedClass(m, cacheClass, "vb.StageCache");
    m.writePtr(cacheInst + 0x10n, infoInst);
    seedInstance(m, infoInst, infoClass);
    seedClass(m, infoClass, "StageInfoData");

    expect(findStageCacheManagerStatic(new ScanContext(m), [e])).toEqual({
      slotRva: 0x6000n,
      currentCache: 0x88,
    });
  });

  it("rejects a StageCache whose info object is not a StageInfoData", () => {
    const m = new FakeMemory();
    const e = seedStageCacheHolder(m, { infoClassName: "SomethingElse" });
    expect(findStageCacheManager(new ScanContext(m), [e])).toBeNull();
  });
});

// ── findLogManager ────────────────────────────────────────────────────────────

/** Seed a LogManager-shaped holder; returns the index entry. */
function seedLogManager(
  m: FakeMemory,
  opts: { entryClassName: string; monsterTypes: number[] },
): ClassEntry {
  const wrapper = 0x7ff400000n;
  const lmInst = 0x7ff410000n;
  const dict = 0x7ff420000n;
  const dictEntries = 0x7ff430000n;
  const list = 0x7ff440000n;
  const listArr = 0x7ff450000n;
  const logClass = 0x7ff460000n;

  const e = entry(m, wrapper, 0x7000n, "nq`1");
  const block = seedStaticBlock(m, wrapper, 0x7ff470000n);
  m.writePtr(block, lmInst);
  seedInstance(m, lmInst, logClass); // header irrelevant for detection but keep valid
  m.writePtr(lmInst + 0x28n, dict);

  // Dictionary<int, List<GetBoxLog>> with one entry: key 3 → list
  m.writePtr(dict + 0x18n, dictEntries);
  m.writeI32(dict + 0x20n, 1);
  const eBase = dictEntries + 0x20n;
  m.writeI32(eBase, 42); // hash ≥ 0
  m.writeI32(eBase + 8n, 3); // ELogType.GetBox
  m.writePtr(eBase + 16n, list);

  // List<GetBoxLog>
  m.writePtr(list + 0x10n, listArr);
  m.writeI32(list + 0x18n, opts.monsterTypes.length);
  const entryClass = 0x7ff480000n;
  seedClass(m, entryClass, opts.entryClassName);
  for (let i = 0; i < opts.monsterTypes.length; i++) {
    const logObj = 0x7ff490000n + BigInt(i * 0x100);
    m.writePtr(listArr + 0x20n + BigInt(i * 8), logObj);
    seedInstance(m, logObj, entryClass);
    m.writeI32(logObj + 0x50n, opts.monsterTypes[i]);
  }
  return e;
}

describe("findLogManager", () => {
  it("finds the holder whose GetBox list contains valid GetBoxLog entries", () => {
    const m = new FakeMemory();
    const e = seedLogManager(m, { entryClassName: "GetBoxLog", monsterTypes: [0, 1, 2] });
    expect(findLogManager(new ScanContext(m), [e])).toEqual({ slotRva: 0x7000n });
  });

  it("rejects a structurally-similar dict whose entries are not GetBoxLog", () => {
    // Live regression: a compiler-generated `<>c` class matched the loose shape.
    const m = new FakeMemory();
    const e = seedLogManager(m, { entryClassName: "SomethingElse", monsterTypes: [0, 0] });
    expect(findLogManager(new ScanContext(m), [e])).toBeNull();
  });

  it("rejects entries with an out-of-range monster type", () => {
    const m = new FakeMemory();
    const e = seedLogManager(m, { entryClassName: "GetBoxLog", monsterTypes: [0, -88672624] });
    expect(findLogManager(new ScanContext(m), [e])).toBeNull();
  });

  it("rejects an empty GetBox list (cannot validate entry shape)", () => {
    const m = new FakeMemory();
    const e = seedLogManager(m, { entryClassName: "GetBoxLog", monsterTypes: [] });
    expect(findLogManager(new ScanContext(m), [e])).toBeNull();
  });
});

// ── findCurrencyManager ───────────────────────────────────────────────────────

const GOLD_KEY = 100001;

/** Seed a currency-manager-shaped class; gold=null omits the gold entry. */
function seedCurrencyManager(m: FakeMemory, base: bigint, gold: bigint | null): ClassEntry {
  const wrapper = base;
  const block = seedStaticBlock(m, wrapper, base + 0x10000n);
  const list = base + 0x20000n;
  const dict = base + 0x30000n;
  const dictEntries = base + 0x40000n;
  const valueObj = base + 0x50000n;

  const e = entry(m, wrapper, base - GA_BASE, "tp");
  m.writePtr(block, list);
  m.writePtr(block + 8n, dict);
  m.writePtr(list + 0x10n, base + 0x60000n); // list internals irrelevant

  m.writePtr(dict + 0x18n, dictEntries);
  m.writeI32(dict + 0x20n, 1);
  const eBase = dictEntries + 0x20n;
  m.writeI32(eBase, 7); // hash
  if (gold != null) {
    m.writeI32(eBase + 8n, GOLD_KEY);
    m.writePtr(eBase + 16n, valueObj);
    // ObscuredLong at valueObj+0x28: hidden@+8, crypto@+16; raw = (hidden - crypto) ^ crypto
    const crypto = 0x1234n;
    const hidden = (gold ^ crypto) + crypto;
    m.writePtr(valueObj + 0x28n + 8n, hidden);
    m.writePtr(valueObj + 0x28n + 16n, crypto);
  } else {
    m.writeI32(eBase + 8n, 55555); // some other currency key
    m.writePtr(eBase + 16n, valueObj);
  }
  return e;
}

describe("findCurrencyManager", () => {
  it("accepts the class whose dict decodes a plausible gold value for goldKey", () => {
    const m = new FakeMemory();
    const e = seedCurrencyManager(m, GA_BASE + 0x1000000n, 3916784446n);
    expect(findCurrencyManager(new ScanContext(m), [e], GOLD_KEY)).toEqual({
      slotRva: 0x1000000n,
    });
  });

  it("rejects the two-pointer shape when the gold probe fails", () => {
    // Live regression: the shape alone matched 783 classes; the gold probe is the filter.
    const m = new FakeMemory();
    const e = seedCurrencyManager(m, GA_BASE + 0x1000000n, null);
    expect(findCurrencyManager(new ScanContext(m), [e], GOLD_KEY)).toBeNull();
  });

  it("rejects an implausible decoded gold value", () => {
    const m = new FakeMemory();
    const e = seedCurrencyManager(m, GA_BASE + 0x1000000n, -5n & 0xffffffffffffffffn);
    expect(findCurrencyManager(new ScanContext(m), [e], GOLD_KEY)).toBeNull();
  });

  it("picks the gold-valid candidate among shape-matching decoys", () => {
    const m = new FakeMemory();
    const decoy = seedCurrencyManager(m, GA_BASE + 0x1000000n, null);
    const real = seedCurrencyManager(m, GA_BASE + 0x2000000n, 123456n);
    const result = findCurrencyManager(new ScanContext(m), [decoy, real], GOLD_KEY);
    expect(result).toEqual({ slotRva: 0x2000000n });
  });
});

// ── findPlayerSaveData ────────────────────────────────────────────────────────

describe("findPlayerSaveData", () => {
  /** Seed pet/item element classes into the index for struct-offset lookup. */
  function seedElementClasses(m: FakeMemory): ClassEntry[] {
    const petClass = 0x7ff600000n;
    const itemClass = 0x7ff610000n;
    const pet = entry(m, petClass, 0x8100n, "PetSaveData");
    seedFields(m, petClass, [
      { name: "PetKey", offset: 0x10 },
      { name: "IsUnlock", offset: 0x14 },
    ]);
    const item = entry(m, itemClass, 0x8200n, "ItemSaveData");
    seedFields(m, itemClass, [
      { name: "ItemKey", offset: 0x10 },
      { name: "IsChaotic", offset: 0x20 },
    ]);
    return [pet, item];
  }

  it("resolves via serialization-stable field names on the holder class", () => {
    const m = new FakeMemory();
    const elements = seedElementClasses(m);

    const wrapper = 0x7ff700000n;
    const holderClass = 0x7ff710000n;
    const holder = 0x7ff720000n;
    const e = entry(m, wrapper, 0x8000n, "csd");
    const block = seedStaticBlock(m, wrapper, 0x7ff730000n);
    m.writePtr(block + 0x10n, holder);
    seedInstance(m, holder, holderClass);
    seedClass(m, holderClass, "PlayerSaveData");
    seedFields(m, holderClass, [
      { name: "PetSaveData", offset: 0x68 },
      { name: "itemSaveDatas", offset: 0xa0 },
    ]);

    const result = findPlayerSaveData(new ScanContext(m), [e, ...elements]);
    expect(result).toEqual({
      commonSaveData: 0x8000n,
      playerStaticOff: 0x10,
      petSaveDatas: 0x68,
      itemSaveDatas: 0xa0,
      petKey: 0x10,
      petIsUnlock: 0x14,
      itemKey: 0x10,
      itemIsChaotic: 0x20,
    });
  });

  it("falls back to hunting for a List<PetSaveData> among raw instance fields", () => {
    const m = new FakeMemory();
    const elements = seedElementClasses(m);
    const petClassPtr = elements[0].classPtr;

    const wrapper = 0x7ff700000n;
    const holderClass = 0x7ff710000n;
    const holder = 0x7ff720000n;
    const list = 0x7ff740000n;
    const listArr = 0x7ff750000n;
    const petObj = 0x7ff760000n;

    const e = entry(m, wrapper, 0x8000n, "csd");
    const block = seedStaticBlock(m, wrapper, 0x7ff730000n);
    m.writePtr(block + 0x8n, holder);
    seedInstance(m, holder, holderClass);
    seedClass(m, holderClass, "ObfuscatedHolder");
    seedFields(m, holderClass, [{ name: "renamed", offset: 0x30 }]); // no stable names
    m.writePtr(holder + 0x30n, list);
    m.writePtr(list + 0x10n, listArr);
    m.writeI32(list + 0x18n, 1);
    m.writePtr(listArr + 0x20n, petObj);
    seedInstance(m, petObj, petClassPtr);

    const result = findPlayerSaveData(new ScanContext(m), [e, ...elements]);
    expect(result).not.toBeNull();
    expect(result!.commonSaveData).toBe(0x8000n);
    expect(result!.playerStaticOff).toBe(0x8);
    expect(result!.petSaveDatas).toBe(0x30);
    expect(result!.petKey).toBe(0x10);
  });

  it("returns null when no static-reachable object carries save lists", () => {
    const m = new FakeMemory();
    const wrapper = 0x7ff700000n;
    const someClass = 0x7ff710000n;
    const inst = 0x7ff720000n;
    const e = entry(m, wrapper, 0x8000n, "csd");
    const block = seedStaticBlock(m, wrapper, 0x7ff730000n);
    m.writePtr(block, inst);
    seedInstance(m, inst, someClass);
    seedClass(m, someClass, "NotThePlayer");
    seedFields(m, someClass, [{ name: "unrelated", offset: 0x18 }]);

    expect(findPlayerSaveData(new ScanContext(m), [e])).toBeNull();
  });
});
