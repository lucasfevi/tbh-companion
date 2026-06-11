import type { PetBestStage, PetAppearStage, PetRow, PetState } from "../../../shared/types";
import { stageName } from "../stages";
import type { PetCatalog, PetCatalogEntry } from "./catalog";
import { expectedKillsPerClear, formatRunsMessage, runsToUnlock } from "./farm";
import type { PetSaveRow } from "./parse";

function buildAppearStages(entry: PetCatalogEntry): PetAppearStage[] | undefined {
  if (!entry.appearsOnStages?.length) return undefined;
  return entry.appearsOnStages.map((s) => ({
    act: s.act,
    stage: s.stage,
    name: s.name,
    label: `${s.act}-${s.stage} ${s.name}`,
  }));
}

function buildBestStages(
  entry: PetCatalogEntry,
  killCount: number,
  killTarget: number,
  unlocked: boolean,
): PetBestStage[] | undefined {
  if (entry.unlockKind !== "kills" || !entry.bestFarmStages?.length) return undefined;

  const remaining = Math.max(0, killTarget - killCount);

  return entry.bestFarmStages.map((stage) => {
    const expected = expectedKillsPerClear(stage.monstersPerClear, stage.spawnPercent);
    const roundedExpected = Math.round(expected * 10) / 10;
    const runs = runsToUnlock(remaining, expected);
    return {
      stageKey: stage.stageKey,
      difficultyLabel: stageName(stage.stageKey),
      locationName: stage.stageName,
      spawnPercent: stage.spawnPercent,
      expectedKillsPerClear: roundedExpected,
      runsMessage: unlocked ? undefined : formatRunsMessage(runs, false),
    };
  });
}

function resolvePetRow(
  entry: PetCatalogEntry,
  saveRow: PetSaveRow | undefined,
  killCount: number,
  killTarget: number,
  arrangedPetKey: number,
  dlcLabel: string,
): PetRow {
  const unlocked = saveRow?.unlocked ?? false;
  const equipped = arrangedPetKey > 0 && entry.petKey === arrangedPetKey;

  if (entry.unlockKind === "dlc") {
    return {
      petKey: entry.petKey,
      name: entry.name,
      unlocked,
      equipped,
      unlockKind: "dlc",
      bonuses: entry.bonuses,
      dlcLabel,
    };
  }

  const target = killTarget;
  const killsRemaining = Math.max(0, target - killCount);
  const progressPct = target > 0 ? Math.min(100, (killCount / target) * 100) : 0;

  return {
    petKey: entry.petKey,
    name: entry.name,
    unlocked,
    equipped,
    unlockKind: "kills",
    killCount,
    killTarget: target,
    killsRemaining,
    progressPct,
    bonuses: entry.bonuses,
    appearsOnStages: buildAppearStages(entry),
    bestStages: buildBestStages(entry, killCount, target, unlocked),
  };
}

export function buildPetState(
  catalog: PetCatalog,
  saveRows: PetSaveRow[],
  killCounts: Map<number, number>,
  arrangedPetKey: number,
  saveMtime: number,
): PetState {
  const saveByKey = new Map(saveRows.map((r) => [r.petKey, r]));
  const killTarget = catalog.unlockKillCount;

  const pets = catalog.pets.map((entry) => {
    const monsterKey = entry.unlockMonsterKey ?? 0;
    const killCount = monsterKey > 0 ? (killCounts.get(monsterKey) ?? 0) : 0;
    return resolvePetRow(
      entry,
      saveByKey.get(entry.petKey),
      killCount,
      killTarget,
      arrangedPetKey,
      catalog.dlcLabel,
    );
  });

  return {
    pets,
    saveMtime,
    arrangedPetKey,
    unlockKillCount: killTarget,
    dlcLabel: catalog.dlcLabel,
  };
}
