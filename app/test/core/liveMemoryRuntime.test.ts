import { describe, it, expect } from "vitest";
import {
  readRuntimeStage,
  readRuntimeGold,
  readRuntimeHeroes,
  readRuntimeBoxCount,
  readRuntimeInventory,
  readRuntimePets,
  makeGoldPinState,
  type GoldPinState,
} from "../../src/core/liveMemory/runtime";
import { offsetsForVersion } from "../../src/core/liveMemory/offsets";
import { FakeMemory } from "./liveMemoryFake";

const O = offsetsForVersion("1.00.21")!;
const GA_BASE = 0x140000000n;
const GA_SIZE = 0x6000000;

// Heap addresses used to wire the synthetic chain.
const STAGE_CLASS = 0x200000n;
const STAGE_BLOCK = 0x300000n;
const STAGE_CACHE = 0x210000n;
const STAGE_INFO = 0x220000n;
const SM_CLASS = 0x400000n;
const SM_BLOCK = 0x500000n;
const SM_SINGLETON = 0x510000n;

const CAND = O.il2cppClass.staticFieldsOffsets[0]; // 0xb0 — first static-field candidate

/** Seed the StageCacheManager → StageCache → StageInfoData chain up to StageInfoData. */
function seedStageChain(m: FakeMemory): FakeMemory {
  const slot = GA_BASE + O.typeInfoRva.stageCacheManager;
  return m
    .writePtr(slot, STAGE_CLASS)
    .writePtr(STAGE_CLASS + BigInt(CAND), STAGE_BLOCK)
    .writePtr(STAGE_BLOCK + BigInt(O.runtime.stage.currentCache), STAGE_CACHE)
    .writePtr(STAGE_CACHE + BigInt(O.runtime.stage.cacheInfoData), STAGE_INFO);
}

/** Seed the StageManager singleton so a wave counter can be read at +runtimeWave. */
function seedStageManager(m: FakeMemory, wave: number): FakeMemory {
  const slot = GA_BASE + O.typeInfoRva.stageManager;
  return m
    .writePtr(slot, SM_CLASS)
    .writePtr(SM_CLASS + BigInt(CAND), SM_BLOCK)
    .writePtr(SM_BLOCK, SM_SINGLETON)
    .writeI32(SM_SINGLETON + BigInt(O.runtime.stage.runtimeWave), wave);
}

describe("readRuntimeStage", () => {
  it("reads the live stage key and wave from the full chain", () => {
    const m = seedStageChain(new FakeMemory()).writeI32(
      STAGE_INFO + BigInt(O.runtime.stage.stageKey),
      1234,
    );
    seedStageManager(m, 5);
    expect(readRuntimeStage(m, GA_BASE, GA_SIZE, O)).toEqual({ stageKey: 1234, wave: 5 });
  });

  it("returns wave null when the StageManager singleton is absent", () => {
    const m = seedStageChain(new FakeMemory()).writeI32(
      STAGE_INFO + BigInt(O.runtime.stage.stageKey),
      42,
    );
    expect(readRuntimeStage(m, GA_BASE, GA_SIZE, O)).toEqual({ stageKey: 42, wave: null });
  });

  it("nulls an implausible stage key (never returns a wrong value)", () => {
    const m = seedStageChain(new FakeMemory()).writeI32(
      STAGE_INFO + BigInt(O.runtime.stage.stageKey),
      0, // implausible
    );
    seedStageManager(m, 3);
    expect(readRuntimeStage(m, GA_BASE, GA_SIZE, O)).toEqual({ stageKey: null, wave: 3 });
  });

  it("ignores an implausible wave value", () => {
    const m = seedStageChain(new FakeMemory()).writeI32(
      STAGE_INFO + BigInt(O.runtime.stage.stageKey),
      77,
    );
    seedStageManager(m, 0); // wave 0 is implausible
    expect(readRuntimeStage(m, GA_BASE, GA_SIZE, O)).toEqual({ stageKey: 77, wave: null });
  });

  it("returns null when the stage-cache chain can't be walked", () => {
    expect(readRuntimeStage(new FakeMemory(), GA_BASE, GA_SIZE, O)).toBeNull();
  });
});

// ── readRuntimeGold ───────────────────────────────────────────────────────────

const CURR_CLASS = 0x600000n;
const CURR_BLOCK = 0x700000n;
const DICT_OBJ = 0x710000n;
const ENTRIES_ARR = 0x720000n;
const CURR_ENTRY = 0x730000n;

/**
 * Seed an ACTk ObscuredLong into FakeMemory at `structAddr`.
 * FakeMemory is keyed by exact address, so each 8-byte field is seeded separately.
 * Layout: hidden@structAddr+8, cryptoKey@structAddr+16.
 * Decode: (hidden - cryptoKey) ^ cryptoKey === goldVal.
 */
function seedObscuredLong(
  m: FakeMemory,
  structAddr: bigint,
  goldVal: bigint,
  cryptoKey: bigint,
): void {
  const hidden = (goldVal ^ cryptoKey) + cryptoKey;
  const hBuf = Buffer.alloc(8);
  hBuf.writeBigInt64LE(hidden, 0);
  m.writeBytes(structAddr + 8n, hBuf);
  const kBuf = Buffer.alloc(8);
  kBuf.writeBigInt64LE(cryptoKey, 0);
  m.writeBytes(structAddr + 16n, kBuf);
}

/**
 * Seed the CurrencyManager → dict → entry chain.
 * `entryAddr` defaults to CURR_ENTRY; pass a different address to test pin staleness.
 */
function seedGoldChain(
  m: FakeMemory,
  goldVal: bigint,
  opts: { entryAddr?: bigint; cryptoKey?: bigint; goldKey?: number } = {},
): FakeMemory {
  const entryAddr = opts.entryAddr ?? CURR_ENTRY;
  const cryptoKey = opts.cryptoKey ?? 5678n;
  const goldKey = opts.goldKey ?? O.goldKey;

  const slot = GA_BASE + O.typeInfoRva.currencyManager;

  // TypeInfo → class → static_fields block → dict ptr
  m.writePtr(slot, CURR_CLASS)
    .writePtr(CURR_CLASS + BigInt(CAND), CURR_BLOCK)
    .writePtr(CURR_BLOCK + BigInt(O.runtime.currency.dict), DICT_OBJ);

  // Dict object: entries array ptr + count
  m.writePtr(DICT_OBJ + BigInt(O.dict.entries), ENTRIES_ARR)
    .writeI32(DICT_OBJ + BigInt(O.dict.count), 1);

  // Entries array: one entry at arrayFirst — each field seeded at its read address
  const eBase = ENTRIES_ARR + BigInt(O.container.arrayFirst);
  m.writeI32(eBase + BigInt(O.dict.entryHash), 1); // positive = valid slot
  m.writeI32(eBase + BigInt(O.dict.entryKey), goldKey);
  m.writePtr(eBase + BigInt(O.dict.entryValue), entryAddr);

  // Currency entry: ObscuredLong at +entryObscuredQty (each field seeded at its read address)
  seedObscuredLong(m, entryAddr + BigInt(O.runtime.currency.entryObscuredQty), goldVal, cryptoKey);

  return m;
}

describe("readRuntimeGold", () => {
  it("decodes gold from a valid dict entry", () => {
    const m = seedGoldChain(new FakeMemory(), 99_000n);
    const pin = makeGoldPinState();
    expect(readRuntimeGold(m, GA_BASE, GA_SIZE, O, pin)).toBe(99_000);
    expect(pin.entryPtr).toBe(CURR_ENTRY);
    expect(pin.lastKnown).toBe(99_000);
  });

  it("hits the pin cache on a second read without re-walking the dict", () => {
    const m = seedGoldChain(new FakeMemory(), 42_000n);
    const pin = makeGoldPinState();
    readRuntimeGold(m, GA_BASE, GA_SIZE, O, pin); // primes the pin

    // Poison the dict so a re-walk would return null
    const poisonedDictObj = 0x1n; // below 0x10000 — readPtr rejects it
    m.writePtr(CURR_BLOCK + BigInt(O.runtime.currency.dict), poisonedDictObj);

    // Second read must still succeed via the cached entry pointer
    expect(readRuntimeGold(m, GA_BASE, GA_SIZE, O, pin)).toBe(42_000);
  });

  it("retries the dict walk when the cached entry pointer goes stale", () => {
    // Seed the dict normally pointing at CURR_ENTRY with gold = 77_001
    const m = seedGoldChain(new FakeMemory(), 77_001n);

    // Give pin a stale pointer to an address never seeded — readGoldFromEntry returns null
    const STALE_PTR = 0x7f0000n;
    const pin: GoldPinState = { entryPtr: STALE_PTR, lastKnown: null };

    const result = readRuntimeGold(m, GA_BASE, GA_SIZE, O, pin);
    expect(result).toBe(77_001);
    // Pin updated to the real entry after successful dict walk
    expect(pin.entryPtr).toBe(CURR_ENTRY);
  });

  it("returns lastKnown when all read attempts fail", () => {
    const pin: GoldPinState = { entryPtr: null, lastKnown: 55_000 };
    // Empty memory — no currency manager resolvable
    expect(readRuntimeGold(new FakeMemory(), GA_BASE, GA_SIZE, O, pin)).toBe(55_000);
  });

  it("returns null when currency manager is not found and no lastKnown", () => {
    const pin = makeGoldPinState();
    expect(readRuntimeGold(new FakeMemory(), GA_BASE, GA_SIZE, O, pin)).toBeNull();
  });

  it("rejects an implausible decoded value (negative) and falls back to lastKnown", () => {
    // Seed the chain structure but plant an ObscuredLong that decodes to -1 (implausible)
    const m = seedGoldChain(new FakeMemory(), 0n); // seeds the pointer chain
    // Overwrite the ObscuredLong fields so it decodes to -1
    const cryptoKey = 1n;
    const badVal = -1n; // BigInt signed: decodes to negative → rejected by plausibleGold
    seedObscuredLong(m, CURR_ENTRY + BigInt(O.runtime.currency.entryObscuredQty), badVal, cryptoKey);

    const pin: GoldPinState = { entryPtr: null, lastKnown: 1234 };
    expect(readRuntimeGold(m, GA_BASE, GA_SIZE, O, pin)).toBe(1234);
  });
});

// ── readRuntimeHeroes ─────────────────────────────────────────────────────────

const HERO_LIST_OBJ = 0x800000n;
const HERO_ITEMS_ARR = 0x810000n;
const HERO1 = 0x820000n;
const HERO2 = 0x830000n;

/** Seed StageManager singleton → HeroList → items array → hero objects. */
function seedHeroChain(m: FakeMemory, heroes: Array<{ heroKey: number; level: number; exp: number }>): FakeMemory {
  // SM singleton via static-fields block (reuse SM_CLASS/SM_BLOCK/SM_SINGLETON from above)
  const slot = GA_BASE + O.typeInfoRva.stageManager;
  m.writePtr(slot, SM_CLASS)
    .writePtr(SM_CLASS + BigInt(CAND), SM_BLOCK)
    .writePtr(SM_BLOCK, SM_SINGLETON);

  // HeroList pointer at SM_SINGLETON + heroList offset
  m.writePtr(SM_SINGLETON + BigInt(O.runtime.heroList), HERO_LIST_OBJ);

  // List object: items array ptr + size
  m.writePtr(HERO_LIST_OBJ + BigInt(O.container.listItems), HERO_ITEMS_ARR)
    .writeI32(HERO_LIST_OBJ + BigInt(O.container.listSize), heroes.length);

  // Seed each hero ptr in the items array, then seed hero fields
  const heroPtrs = [HERO1, HERO2];
  const first = HERO_ITEMS_ARR + BigInt(O.container.arrayFirst);
  for (let i = 0; i < heroes.length; i++) {
    const heroAddr = heroPtrs[i];
    m.writePtr(first + BigInt(i * 8), heroAddr);
    m.writeI32(heroAddr + BigInt(O.hero.heroKey), heroes[i].heroKey);
    m.writeI32(heroAddr + BigInt(O.hero.level), heroes[i].level);
    m.writeI32(heroAddr + BigInt(O.hero.exp), heroes[i].exp);
  }

  return m;
}

describe("readRuntimeHeroes", () => {
  it("reads hero list with correct heroKey, level, and exp", () => {
    const m = seedHeroChain(new FakeMemory(), [
      { heroKey: 1001, level: 50, exp: 12345 },
      { heroKey: 1002, level: 30, exp: 6789 },
    ]);
    const result = readRuntimeHeroes(m, GA_BASE, GA_SIZE, O);
    expect(result).toHaveLength(2);
    expect(result![0]).toEqual({ heroKey: 1001, level: 50, exp: 12345 });
    expect(result![1]).toEqual({ heroKey: 1002, level: 30, exp: 6789 });
  });

  it("returns null when StageManager singleton is absent", () => {
    expect(readRuntimeHeroes(new FakeMemory(), GA_BASE, GA_SIZE, O)).toBeNull();
  });

  it("returns null when HeroList pointer is missing", () => {
    const slot = GA_BASE + O.typeInfoRva.stageManager;
    const m = new FakeMemory()
      .writePtr(slot, SM_CLASS)
      .writePtr(SM_CLASS + BigInt(CAND), SM_BLOCK)
      .writePtr(SM_BLOCK, SM_SINGLETON);
    // SM_SINGLETON + heroList → not seeded → null
    expect(readRuntimeHeroes(m, GA_BASE, GA_SIZE, O)).toBeNull();
  });

  it("skips hero slots with zero heroKey", () => {
    const m = seedHeroChain(new FakeMemory(), [
      { heroKey: 0, level: 1, exp: 0 }, // invalid — heroKey 0 skipped
      { heroKey: 1003, level: 10, exp: 500 },
    ]);
    const result = readRuntimeHeroes(m, GA_BASE, GA_SIZE, O);
    expect(result).toHaveLength(1);
    expect(result![0].heroKey).toBe(1003);
  });

  it("returns null when list is empty", () => {
    const m = seedHeroChain(new FakeMemory(), []);
    // count = 0 → guard rejects
    expect(readRuntimeHeroes(m, GA_BASE, GA_SIZE, O)).toBeNull();
  });
});

// ── readRuntimeBoxCount ───────────────────────────────────────────────────────

describe("readRuntimeBoxCount", () => {
  it("returns null when boxCount offset is 0 (not yet derived for this version)", () => {
    // V1_00_21 has boxCount: 0 — offset not derived yet
    expect(readRuntimeBoxCount(new FakeMemory(), GA_BASE, GA_SIZE, O)).toBeNull();
  });

  it("reads the box count from StageManager when offset is non-zero", () => {
    // Build a patched offsets table with a real boxCount offset
    const BOX_OFFSET = 0x150;
    const patchedO = {
      ...O,
      runtime: { ...O.runtime, stage: { ...O.runtime.stage, boxCount: BOX_OFFSET } },
    };
    const m = new FakeMemory();
    const slot = GA_BASE + O.typeInfoRva.stageManager;
    m.writePtr(slot, SM_CLASS)
      .writePtr(SM_CLASS + BigInt(CAND), SM_BLOCK)
      .writePtr(SM_BLOCK, SM_SINGLETON)
      .writeI32(SM_SINGLETON + BigInt(BOX_OFFSET), 42);

    expect(readRuntimeBoxCount(m, GA_BASE, GA_SIZE, patchedO)).toBe(42);
  });

  it("returns null when StageManager singleton is absent", () => {
    const patchedO = {
      ...O,
      runtime: { ...O.runtime, stage: { ...O.runtime.stage, boxCount: 0x150 } },
    };
    expect(readRuntimeBoxCount(new FakeMemory(), GA_BASE, GA_SIZE, patchedO)).toBeNull();
  });
});

// ── readRuntimeInventory ──────────────────────────────────────────────────────

// Patched offsets with derived inventory struct fields.
const INV_RVA = 0x100000n; // fake TypeInfo RVA inside GA range
const INV_CLASS = 0x900000n;
const INV_BLOCK = 0xa00000n;
const INV_DICT = 0xa10000n;
const INV_ENTRIES = 0xa20000n;
const INV_ITEM = 0xa30000n;

const INV_O = {
  ...O,
  typeInfoRva: { ...O.typeInfoRva, localInventoryManager: INV_RVA },
  inventoryItem: { itemKey: 0x10, isChaotic: 0x14, location: 0x18 },
};

function seedInventoryChain(
  m: FakeMemory,
  items: Array<{ itemKey: number; isChaotic: boolean; location: number }>,
): FakeMemory {
  // TypeInfo → class → static fields block → dict at field offset 0
  m.writePtr(GA_BASE + INV_RVA, INV_CLASS)
    .writePtr(INV_CLASS + BigInt(CAND), INV_BLOCK)
    .writePtr(INV_BLOCK, INV_DICT); // field offset 0 = first bag dict

  // Dict: entries array + count
  m.writePtr(INV_DICT + BigInt(O.dict.entries), INV_ENTRIES)
    .writeI32(INV_DICT + BigInt(O.dict.count), items.length);

  // Entries: one per item, each pointing to an INV_ITEM object
  const first = INV_ENTRIES + BigInt(O.container.arrayFirst);
  for (let i = 0; i < items.length; i++) {
    const eBase = first + BigInt(i * O.dict.entrySize);
    const itemAddr = INV_ITEM + BigInt(i * 0x100);
    m.writeI32(eBase + BigInt(O.dict.entryHash), 1); // valid slot
    m.writeI32(eBase + BigInt(O.dict.entryKey), items[i].itemKey);
    m.writePtr(eBase + BigInt(O.dict.entryValue), itemAddr);
    m.writeI32(itemAddr + BigInt(INV_O.inventoryItem.itemKey), items[i].itemKey);
    m.writeI32(itemAddr + BigInt(INV_O.inventoryItem.isChaotic), items[i].isChaotic ? 1 : 0);
    m.writeI32(itemAddr + BigInt(INV_O.inventoryItem.location), items[i].location);
  }

  return m;
}

describe("readRuntimeInventory", () => {
  it("returns null when localInventoryManager RVA is 0 (offset not derived)", () => {
    expect(readRuntimeInventory(new FakeMemory(), GA_BASE, GA_SIZE, O)).toBeNull();
  });

  it("reads items from the inventory dict", () => {
    const m = seedInventoryChain(new FakeMemory(), [
      { itemKey: 910151, isChaotic: false, location: 0 },
      { itemKey: 920201, isChaotic: true, location: 1 },
    ]);
    const result = readRuntimeInventory(m, GA_BASE, GA_SIZE, INV_O);
    expect(result).toHaveLength(2);
    expect(result![0]).toEqual({ itemKey: 910151, isChaotic: false, location: 0 });
    expect(result![1]).toEqual({ itemKey: 920201, isChaotic: true, location: 1 });
  });

  it("skips entries with zero or negative itemKey", () => {
    const m = seedInventoryChain(new FakeMemory(), [
      { itemKey: 0, isChaotic: false, location: 0 }, // skipped
      { itemKey: 910152, isChaotic: false, location: 0 },
    ]);
    const result = readRuntimeInventory(m, GA_BASE, GA_SIZE, INV_O);
    expect(result).toHaveLength(1);
    expect(result![0].itemKey).toBe(910152);
  });

  it("returns null when the dict is unreadable", () => {
    // Seeds class→block but no dict — readStaticFieldPtr returns null for field 0
    const m = new FakeMemory()
      .writePtr(GA_BASE + INV_RVA, INV_CLASS)
      .writePtr(INV_CLASS + BigInt(CAND), INV_BLOCK);
    // INV_BLOCK + 0 not seeded → readPtr returns null → skip both dicts → results empty
    expect(readRuntimeInventory(m, GA_BASE, GA_SIZE, INV_O)).toBeNull();
  });
});

// ── readRuntimePets ───────────────────────────────────────────────────────────

const PET_PET_SAVEDS_OFFSET = 0x60;
const PET_KEY_OFFSET = 0x10;
const PET_UNLOCK_OFFSET = 0x14;

const PET_O = {
  ...O,
  player: { ...O.player, petSaveDatas: PET_PET_SAVEDS_OFFSET },
  petSaveData: { petKey: PET_KEY_OFFSET, isUnlock: PET_UNLOCK_OFFSET },
};

const CS_CLASS_P = 0xb00000n;
const CS_BLOCK_P = 0xc00000n;
const PLAYER_OBJ = 0xc10000n;
const PET_LIST_OBJ = 0xc20000n;
const PET_ITEMS_ARR = 0xc30000n;
const PET1 = 0xc40000n;
const PET2 = 0xc50000n;

function seedPetChain(
  m: FakeMemory,
  pets: Array<{ petKey: number; unlocked: boolean }>,
): FakeMemory {
  // CommonSaveData TypeInfo → class → static fields → playerPtr at +commonSaveData(0x10)
  m.writePtr(GA_BASE + PET_O.typeInfoRva.commonSaveData, CS_CLASS_P)
    .writePtr(CS_CLASS_P + BigInt(CAND), CS_BLOCK_P)
    .writePtr(CS_BLOCK_P + BigInt(PET_O.player.commonSaveData), PLAYER_OBJ);

  // Player → petSaveDatas List at +0x60
  m.writePtr(PLAYER_OBJ + BigInt(PET_PET_SAVEDS_OFFSET), PET_LIST_OBJ)
    .writePtr(PET_LIST_OBJ + BigInt(O.container.listItems), PET_ITEMS_ARR)
    .writeI32(PET_LIST_OBJ + BigInt(O.container.listSize), pets.length);

  const petPtrs = [PET1, PET2];
  const first = PET_ITEMS_ARR + BigInt(O.container.arrayFirst);
  for (let i = 0; i < pets.length; i++) {
    const petAddr = petPtrs[i];
    m.writePtr(first + BigInt(i * 8), petAddr)
      .writeI32(petAddr + BigInt(PET_KEY_OFFSET), pets[i].petKey)
      .writeI32(petAddr + BigInt(PET_UNLOCK_OFFSET), pets[i].unlocked ? 1 : 0);
  }

  return m;
}

describe("readRuntimePets", () => {
  it("returns null when petSaveDatas offset is 0 (not yet derived)", () => {
    expect(readRuntimePets(new FakeMemory(), GA_BASE, GA_SIZE, O)).toBeNull();
  });

  it("reads pet list with key and unlock status", () => {
    const m = seedPetChain(new FakeMemory(), [
      { petKey: 5001, unlocked: true },
      { petKey: 5002, unlocked: false },
    ]);
    const result = readRuntimePets(m, GA_BASE, GA_SIZE, PET_O);
    expect(result).toHaveLength(2);
    expect(result![0]).toEqual({ petKey: 5001, unlocked: true });
    expect(result![1]).toEqual({ petKey: 5002, unlocked: false });
  });

  it("skips entries with zero petKey", () => {
    const m = seedPetChain(new FakeMemory(), [
      { petKey: 0, unlocked: false }, // invalid — skipped
      { petKey: 5003, unlocked: true },
    ]);
    const result = readRuntimePets(m, GA_BASE, GA_SIZE, PET_O);
    expect(result).toHaveLength(1);
    expect(result![0].petKey).toBe(5003);
  });

  it("returns null when CommonSaveData singleton is absent", () => {
    expect(readRuntimePets(new FakeMemory(), GA_BASE, GA_SIZE, PET_O)).toBeNull();
  });

  it("returns null when pet list is empty", () => {
    const m = seedPetChain(new FakeMemory(), []);
    expect(readRuntimePets(m, GA_BASE, GA_SIZE, PET_O)).toBeNull();
  });
});
