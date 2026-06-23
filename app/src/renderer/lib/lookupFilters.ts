import { GRADE_ORDER, GRADE_RANK } from "../../core/grades";
import { classForGearType, LOOKUP_CLASS_ORDER } from "../../core/lookup/classRestriction";
import { humanizeStatKey, itemDescriptor } from "./lookupDisplay";
import type { LookupItem } from "../../../shared/types";

export type LookupSortKey = "name" | "grade" | "level" | "type";

/** Fixed level bounds for the range filter — the game's level cap, not derived from data. */
export const LEVEL_MIN = 1;
export const LEVEL_MAX = 100;

export interface LookupFilterState {
  query: string;
  typeFilter: string[];
  gradeFilter: string[];
  gearTypeFilter: string[];
  classFilter: string[];
  materialKindFilter: string[];
  effectFilter: string[];
  uniqueOnly: boolean;
  /** `[lo, hi]` over LEVEL_MIN..LEVEL_MAX; the full span means "no level filter". */
  levelRange: [number, number];
  sortKey: LookupSortKey;
  sortDir: "asc" | "desc";
}

/** A multi-select with no selections means "no filter" (match everything). */
function matchesMulti(selected: string[], value: string | null): boolean {
  return selected.length === 0 || (value != null && selected.includes(value));
}

function isFullLevelRange([lo, hi]: [number, number]): boolean {
  return lo <= LEVEL_MIN && hi >= LEVEL_MAX;
}

export function gradeOptionsFromItems(items: LookupItem[]): string[] {
  const present = new Set(items.map((i) => i.grade));
  const ordered = GRADE_ORDER.filter((g) => present.has(g));
  const extras = [...present].filter((g) => GRADE_RANK[g] === undefined).sort();
  return [...ordered, ...extras];
}

export function typeOptionsFromItems(items: LookupItem[]): string[] {
  return [...new Set(items.map((i) => i.type))].sort();
}

export function gearTypeOptionsFromItems(items: LookupItem[]): string[] {
  return [...new Set(items.flatMap((i) => (i.gearType ? [i.gearType] : [])))].sort();
}

export function classOptionsFromItems(items: LookupItem[]): string[] {
  const present = new Set(
    items.flatMap((i) => {
      const cls = classForGearType(i.gearType);
      return cls ? [cls] : [];
    }),
  );
  return LOOKUP_CLASS_ORDER.filter((c) => present.has(c));
}

export function materialKindOptionsFromItems(items: LookupItem[]): string[] {
  return [...new Set(items.flatMap((i) => (i.materialType ? [i.materialType] : [])))].sort();
}

export interface LookupEffectOption {
  value: string;
  label: string;
}

/** Union of every distinct stat key across gear stats and material outcomes. */
export function effectOptionsFromItems(items: LookupItem[]): LookupEffectOption[] {
  const keys = new Set<string>();
  for (const item of items) {
    if (item.stats) {
      for (const row of [...item.stats.base, ...item.stats.inherent]) keys.add(row.stat);
    }
    if (item.gearGroups) {
      for (const group of item.gearGroups) {
        for (const outcome of group.outcomes) keys.add(outcome.stat);
      }
    }
  }
  return [...keys]
    .map((value) => ({ value, label: humanizeStatKey(value) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function itemHasEffect(item: LookupItem, statKey: string): boolean {
  if (item.stats?.base.some((row) => row.stat === statKey)) return true;
  if (item.stats?.inherent.some((row) => row.stat === statKey)) return true;
  if (item.gearGroups?.some((group) => group.outcomes.some((o) => o.stat === statKey))) return true;
  return false;
}

/** Raw game localization keys that never resolved to en-US text (dev placeholders). */
export function isUnresolvedLocalizationKey(name: string): boolean {
  return /^Item(?:Name|Description)_\d+$/.test(name);
}

export function filterAndSortItems(items: LookupItem[], state: LookupFilterState): LookupItem[] {
  const q = state.query.trim().toLowerCase();
  const fullLevel = isFullLevelRange(state.levelRange);
  const [minLevel, maxLevel] = state.levelRange;
  let rows = items.filter((item) => {
    if (isUnresolvedLocalizationKey(item.name)) return false;
    if (!matchesMulti(state.typeFilter, item.type)) return false;
    if (!matchesMulti(state.gradeFilter, item.grade)) return false;
    if (!matchesMulti(state.gearTypeFilter, item.gearType)) return false;
    if (!matchesMulti(state.classFilter, classForGearType(item.gearType))) return false;
    if (!matchesMulti(state.materialKindFilter, item.materialType)) return false;
    if (
      state.effectFilter.length > 0 &&
      !state.effectFilter.some((statKey) => itemHasEffect(item, statKey))
    ) {
      return false;
    }
    if (state.uniqueOnly && !item.stats?.unique) return false;
    // Material-safe: items without a level (materials) always pass the level check,
    // so a persisted level band only narrows gear.
    if (!fullLevel && item.level != null && (item.level < minLevel || item.level > maxLevel)) {
      return false;
    }
    if (q && !item.name.toLowerCase().includes(q)) return false;
    return true;
  });

  const dir = state.sortDir === "asc" ? 1 : -1;
  rows = [...rows].sort((a, b) => {
    let cmp: number;
    if (state.sortKey === "name") cmp = a.name.localeCompare(b.name);
    else if (state.sortKey === "level") cmp = (a.level ?? -1) - (b.level ?? -1);
    else if (state.sortKey === "type") cmp = itemDescriptor(a).localeCompare(itemDescriptor(b));
    else cmp = (GRADE_RANK[a.grade] ?? -1) - (GRADE_RANK[b.grade] ?? -1);
    if (cmp === 0 && state.sortKey !== "name") cmp = a.name.localeCompare(b.name);
    return cmp * dir;
  });
  return rows;
}

export function defaultLookupSortDir(key: LookupSortKey): "asc" | "desc" {
  return key === "grade" ? "desc" : "asc";
}
