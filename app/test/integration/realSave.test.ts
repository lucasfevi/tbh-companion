import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildChestState,
  loadBoxTypeCatalog,
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

  it("parses BoxData and common capacity from live save", () => {
    const { text, mtime } = readAndDecrypt(savePath);
    const raw = parseInventory(text, mtime);
    expect(raw.chests.length).toBeGreaterThan(0);

    const purchases = parseRuneSaveData(text);
    expect(purchases.length).toBeGreaterThan(0);

    const chestState = buildChestState(
      raw.chests,
      purchases,
      mtime,
      loadBoxTypeCatalog(),
      loadRuneBoxCapCatalog(),
    );
    expect(chestState.totalHeld).toBeGreaterThan(0);
    expect(chestState.common.capacity).toBeGreaterThanOrEqual(5);
    expect(chestState.common.quantity).toBeGreaterThan(0);
    expect(chestState.capacity.totalRunePurchases).toBeGreaterThan(0);
    expect(chestState.capacity.common.purchasedCapRuneNodes).toBe(2);
    expect(chestState.capacity.common.runeBonus).toBe(2);
    expect(chestState.common.capacity).toBe(7);
    expect(chestState.stageBoss.capacity).toBe(11);
    expect(chestState.capacity.stageBoss.runeBonus).toBe(6);
    expect(chestState.actBoss.capacity).toBe(7);
    expect(chestState.capacity.actBoss.runeBonus).toBe(2);
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

    expect(state.pets).toHaveLength(8);
    const farmable = state.pets.filter((p) => p.unlockKind === "kills");
    expect(farmable).toHaveLength(5);
    for (const pet of farmable) {
      expect(pet.bestStages?.length).toBe(3);
      expect(pet.appearsOnStages?.length).toBeGreaterThan(0);
      if (pet.unlocked) {
        expect(pet.killCount).toBeGreaterThanOrEqual(catalog.unlockKillCount);
      }
    }
  });
});
