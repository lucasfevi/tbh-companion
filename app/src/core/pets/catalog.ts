import { readBundledJson } from "../bundledData";

export interface PetFarmStageCatalog {
  stageKey: number;
  stageName: string;
  spawnPercent: number;
  monstersPerClear: number;
}

/** Act-stage locations where the unlock target monster spawns (tbh.city). */
export interface PetAppearStageCatalog {
  act: number;
  stage: number;
  name: string;
}

export interface PetCatalogEntry {
  petKey: number;
  name: string;
  bonuses: string[];
  unlockKind: "kills" | "dlc";
  unlockMonsterKey?: number;
  appearsOnStages?: PetAppearStageCatalog[];
  bestFarmStages?: PetFarmStageCatalog[];
}

export interface PetCatalog {
  unlockKillCount: number;
  dlcLabel: string;
  pets: PetCatalogEntry[];
}

export function loadPetCatalog(): PetCatalog {
  return readBundledJson<PetCatalog>("pets.json");
}
