import { GRADE_ORDER, GRADE_RANK } from "../../core/grades";
import { classForGearType, LOOKUP_CLASS_ORDER } from "../../core/lookup/classRestriction";
import { humanizeStatKey, itemDescriptor } from "./lookupDisplay";
import type { LookupItem } from "../../../shared/types";

export type LookupSortKey = "name" | "grade" | "level" | "type";

export interface LookupFilterState {
  query: string;
  typeFilter: string;
  gradeFilter: string;
  gearTypeFilter: string;
  classFilter: string;
  materialKindFilter: string;
  effectFilter: string;
  targetGroupFilter: string;
  uniqueOnly: boolean;
  minLevel: number | null;
  maxLevel: number | null;
  sortKey: LookupSortKey;
  sortDir: "asc" | "desc";
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

export function targetGroupOptionsFromItems(items: LookupItem[]): string[] {
  const present = new Set(
    items.flatMap(
      (i) => i.gearGroups?.filter((g) => g.outcomes.length > 0).map((g) => g.gearGroup) ?? [],
    ),
  );
  return [...present].sort();
}

export function levelOptionsFromItems(items: LookupItem[]): number[] {
  return [...new Set(items.flatMap((i) => (i.level != null ? [i.level] : [])))].sort(
    (a, b) => a - b,
  );
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
  let rows = items.filter((item) => {
    if (isUnresolvedLocalizationKey(item.name)) return false;
    if (state.typeFilter !== "ALL" && item.type !== state.typeFilter) return false;
    if (state.gradeFilter !== "ALL" && item.grade !== state.gradeFilter) return false;
    if (state.gearTypeFilter !== "ALL" && item.gearType !== state.gearTypeFilter) return false;
    if (state.classFilter !== "ALL" && classForGearType(item.gearType) !== state.classFilter) {
      return false;
    }
    if (state.materialKindFilter !== "ALL" && item.materialType !== state.materialKindFilter) {
      return false;
    }
    if (state.targetGroupFilter !== "ALL") {
      const hasGroup = item.gearGroups?.some(
        (g) => g.gearGroup === state.targetGroupFilter && g.outcomes.length > 0,
      );
      if (!hasGroup) return false;
    }
    if (state.effectFilter !== "ALL" && !itemHasEffect(item, state.effectFilter)) return false;
    if (state.uniqueOnly && !item.stats?.unique) return false;
    if (state.minLevel != null && (item.level == null || item.level < state.minLevel)) {
      return false;
    }
    if (state.maxLevel != null && (item.level == null || item.level > state.maxLevel)) {
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
