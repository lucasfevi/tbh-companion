import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildChestState,
  commonBoxCapacity,
  actBossBoxCapacity,
  stageBossBoxCapacity,
  loadBoxTypeCatalog,
  loadRuneAutoOpenCatalog,
  loadRuneBoxCapCatalog,
  parseRuneSaveData,
} from "../../src/core/boxes";
import { indexById, type GameData } from "../../src/core/gamedata";
import { parseInventory, resolveInventory } from "../../src/core/inventory";
import {
  buildPetState,
  loadPetCatalog,
  parseArrangedPetKey,
  parseMonsterKillCounts,
  parsePetSaveData,
} from "../../src/core/pets";
import { readAndDecrypt, readSnapshot } from "../../src/main/io/saveFile";

// Integration test against the actual local save. Skipped automatically when
// the file isn't present (e.g. CI), so the suite stays deterministic.
const savePath = join(
  process.env.USERPROFILE ?? process.env.HOME ?? "",
  "AppData",
  "LocalLow",
  "TesseractStudio",
  "TaskbarHero",
  "SaveFile_Live.es3",
);

const bundledGameData = join(__dirname, "../../../data/gamedata.json");

function loadCatalogLookup(): (
  key: number,
) => ReturnType<typeof indexById> extends Map<number, infer V> ? V : never {
  const data = JSON.parse(readFileSync(bundledGameData, "utf-8")) as GameData;
  const index = indexById(data.items);
  return (key) => index.get(key);
}

const run = existsSync(savePath) ? describe : describe.skip;

run("real save (local only)", () => {
  it("decrypts and parses the live save", () => {
    const snap = readSnapshot(savePath);
    expect(snap.heroes.length).toBeGreaterThan(0);
    expect(snap.saveMtime).toBeGreaterThan(0);
    expect(snap.totalHeroExp).toBeGreaterThanOrEqual(0);
    expect(snap.gold).toBeGreaterThanOrEqual(0);
  });

  it("resolves inventory from live save", () => {
    const lookup = loadCatalogLookup();
    const { text, mtime } = readAndDecrypt(savePath);
    const raw = parseInventory(text, mtime);
    const resolved = resolveInventory(raw, lookup, true);
    expect(resolved.rows.length).toBeGreaterThan(0);
    expect(resolved.composition.total).toBeGreaterThan(0);
  });

  it("parses BoxData and chest capacity from live save", () => {
    const { text, mtime } = readAndDecrypt(savePath);
    const raw = parseInventory(text, mtime);

    const purchases = parseRuneSaveData(text);
    expect(purchases.length).toBeGreaterThan(0);

    const runeCapCatalog = loadRuneBoxCapCatalog();
    const chestState = buildChestState(
      raw.chests,
      purchases,
      mtime,
      loadBoxTypeCatalog(),
      runeCapCatalog,
      loadRuneAutoOpenCatalog(),
    );

    expect(chestState.totalHeld).toBeGreaterThanOrEqual(0);
    expect(chestState.capacity.totalRunePurchases).toBe(purchases.length);

    const categories = [
      {
        slot: chestState.common,
        breakdown: chestState.capacity.common,
        expectedCapacity: commonBoxCapacity(purchases, runeCapCatalog),
      },
      {
        slot: chestState.stageBoss,
        breakdown: chestState.capacity.stageBoss,
        expectedCapacity: stageBossBoxCapacity(purchases, runeCapCatalog),
      },
      {
        slot: chestState.actBoss,
        breakdown: chestState.capacity.actBoss,
        expectedCapacity: actBossBoxCapacity(purchases, runeCapCatalog),
      },
    ] as const;

    for (const { slot, breakdown, expectedCapacity } of categories) {
      expect(slot.capacity).toBe(expectedCapacity);
      expect(slot.capacity).toBe(breakdown.base + breakdown.runeBonus);
      expect(slot.capacity).toBeGreaterThanOrEqual(breakdown.base);
      expect(slot.quantity).toBeGreaterThanOrEqual(0);
      expect(slot.quantity).toBeLessThanOrEqual(slot.capacity);
      expect(slot.slotsRemaining).toBe(Math.max(0, slot.capacity - slot.quantity));
      expect(breakdown.purchasedCapRuneNodes).toBeGreaterThanOrEqual(0);
      expect(breakdown.runeBonus).toBeGreaterThanOrEqual(0);
    }
  });

  it("parses pets and kill progress from live save", () => {
    const { text, mtime } = readAndDecrypt(savePath);
    const catalog = loadPetCatalog();
    const state = buildPetState(
      catalog,
      parsePetSaveData(text),
      parseMonsterKillCounts(text),
      parseArrangedPetKey(text),
      mtime,
    );

    expect(state.pets).toHaveLength(catalog.pets.length);

    const farmableCatalog = catalog.pets.filter((p) => p.unlockKind === "kills");
    const farmable = state.pets.filter((p) => p.unlockKind === "kills");
    expect(farmable).toHaveLength(farmableCatalog.length);

    for (const pet of farmable) {
      expect(pet.bestStages?.length).toBeGreaterThan(0);
      expect(pet.appearsOnStages?.length).toBeGreaterThan(0);
      if (pet.unlocked) {
        expect(pet.killCount).toBeGreaterThanOrEqual(catalog.unlockKillCount);
      }
    }
  });
});
