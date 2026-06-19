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

export interface AutoOpenDefinition {
  baseSeconds: number;
  runeLabel: string;
  /** Seconds shaved off per purchased level, keyed by rune node id. */
  perLevelSeconds: Record<string, number>;
}

export interface RuneAutoOpenCatalog {
  common: AutoOpenDefinition;
  stageBoss: AutoOpenDefinition;
  actBoss: AutoOpenDefinition;
  note?: string;
}

export function loadBoxTypeCatalog(): BoxTypeCatalog {
  return readBundledJson<BoxTypeCatalog>("box_types.json");
}

export function loadRuneBoxCapCatalog(): RuneBoxCapCatalog {
  return readBundledJson<RuneBoxCapCatalog>("rune_box_cap.json");
}

export function loadRuneAutoOpenCatalog(): RuneAutoOpenCatalog {
  return readBundledJson<RuneAutoOpenCatalog>("rune_auto_open.json");
}

export function boxTypeIndex(catalog: BoxTypeCatalog): Map<number, BoxTypeEntry> {
  return new Map(catalog.types.map((t) => [t.boxType, t]));
}
