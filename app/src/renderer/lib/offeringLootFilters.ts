import { GRADE_ORDER, GRADE_RANK } from "../../core/grades";
import { itemDescriptor } from "./lookupDisplay";
import type { LookupItem, OfferingLootEntry } from "../../../shared/types";

export type OfferingLootSortKey = "dropPct" | "name" | "grade";

export interface OfferingLootFilterState {
  query: string;
  gradeFilter: string;
  typeFilter: string;
  sortKey: OfferingLootSortKey;
  sortDir: "asc" | "desc";
}

export interface ResolvedOfferingLoot {
  itemKey: number;
  poolPct: number;
  item: LookupItem | null;
}

export function resolveOfferingLoot(
  loot: OfferingLootEntry[],
  peekItem: (itemKey: number) => LookupItem | undefined,
): ResolvedOfferingLoot[] {
  return loot.map((entry) => ({
    itemKey: entry.itemKey,
    poolPct: entry.poolPct,
    item: peekItem(entry.itemKey) ?? null,
  }));
}

export function gradeOptionsFromLoot(loot: ResolvedOfferingLoot[]): string[] {
  const present = new Set(loot.flatMap((row) => (row.item ? [row.item.grade] : [])));
  const ordered = GRADE_ORDER.filter((g) => present.has(g));
  const extras = [...present].filter((g) => GRADE_RANK[g] === undefined).sort();
  return [...ordered, ...extras];
}

export function typeOptionsFromLoot(loot: ResolvedOfferingLoot[]): string[] {
  return [...new Set(loot.flatMap((row) => (row.item ? [itemDescriptor(row.item)] : [])))].sort();
}

export function filterAndSortLoot(
  loot: ResolvedOfferingLoot[],
  state: OfferingLootFilterState,
): ResolvedOfferingLoot[] {
  const q = state.query.trim().toLowerCase();
  let rows = loot.filter((row) => {
    if (state.gradeFilter !== "ALL" && row.item?.grade !== state.gradeFilter) return false;
    if (state.typeFilter !== "ALL") {
      const descriptor = row.item ? itemDescriptor(row.item) : "";
      if (descriptor !== state.typeFilter) return false;
    }
    if (q && !(row.item?.name ?? "").toLowerCase().includes(q)) return false;
    return true;
  });

  const dir = state.sortDir === "asc" ? 1 : -1;
  rows = [...rows].sort((a, b) => {
    let cmp: number;
    if (state.sortKey === "name") {
      cmp = (a.item?.name ?? "").localeCompare(b.item?.name ?? "");
    } else if (state.sortKey === "grade") {
      cmp = (GRADE_RANK[a.item?.grade ?? ""] ?? -1) - (GRADE_RANK[b.item?.grade ?? ""] ?? -1);
    } else {
      cmp = a.poolPct - b.poolPct;
    }
    if (cmp === 0 && state.sortKey !== "dropPct") cmp = a.poolPct - b.poolPct;
    return cmp * dir;
  });
  return rows;
}

export function defaultOfferingLootSortDir(key: OfferingLootSortKey): "asc" | "desc" {
  return key === "name" ? "asc" : "desc";
}
