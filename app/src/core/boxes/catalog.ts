import { readBundledJson } from "../bundledData";

export type BoxCategory = "common" | "rare" | "act" | "unknown";

export interface BoxTypeEntry {
  boxType: number;
  label: string;
  category: BoxCategory;
  color: string;
}

export interface BoxTypeCatalog {
  types: BoxTypeEntry[];
}

export interface ChestCapDefinition {
  boxType: number;
  baseCapacity: number;
  bonusPerLevel: number;
  runeLabel: string;
  runeKeys: number[];
}

export interface RuneBoxCapCatalog {
  common: ChestCapDefinition;
  stageBoss: ChestCapDefinition;
  actBoss: ChestCapDefinition;
  note?: string;
}

export interface RareBoxRoute {
  boxId: number;
  level: number;
  idealStageKey: number;
  idealStageLabel: string;
}

export interface RareBoxRoutesCatalog {
  cooldownSeconds: number;
  disclaimer?: string;
  routes: RareBoxRoute[];
}

export function loadBoxTypeCatalog(): BoxTypeCatalog {
  return readBundledJson<BoxTypeCatalog>("box_types.json");
}

export function loadRuneBoxCapCatalog(): RuneBoxCapCatalog {
  return readBundledJson<RuneBoxCapCatalog>("rune_box_cap.json");
}

export function loadRareBoxRoutesCatalog(): RareBoxRoutesCatalog {
  return readBundledJson<RareBoxRoutesCatalog>("rare_box_routes.json");
}

export function boxTypeIndex(catalog: BoxTypeCatalog): Map<number, BoxTypeEntry> {
  return new Map(catalog.types.map((t) => [t.boxType, t]));
}

export function rareRoutesById(catalog: RareBoxRoutesCatalog): Map<number, RareBoxRoute> {
  return new Map(catalog.routes.map((r) => [r.boxId, r]));
}
