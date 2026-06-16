import { GRADE_ORDER, GRADE_RANK } from "../../core/grades";
import { rowMatchesLocation } from "../../core/inventory/location";
import type { ItemLocation, ResolvedInventory, ResolvedInventoryRow } from "../../../shared/types";

export type SortKey =
  | "name"
  | "grade"
  | "level"
  | "type"
  | "count"
  | "inUse"
  | "price"
  | "value"
  | "buyOrder"
  | "buyOrderValue";
export type LocationFilter = "ALL" | ItemLocation;

export interface InventoryFilterState {
  query: string;
  tradableOnly: boolean;
  inUseOnly: boolean;
  gradeFilter: string;
  typeFilter: string;
  locationFilter: LocationFilter;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
}

export function gradeOptionsFromInventory(inv: ResolvedInventory): string[] {
  const present = new Set(inv.rows.map((r) => r.grade));
  const ordered = GRADE_ORDER.filter((g) => present.has(g));
  const extras = [...present].filter((g) => GRADE_RANK[g] === undefined).sort();
  return [...ordered, ...extras.filter((g) => !(ordered as readonly string[]).includes(g))];
}

export function typeOptionsFromInventory(inv: ResolvedInventory): string[] {
  return [...new Set(inv.rows.map((r) => r.type))].sort();
}

export function filterAndSortRows(
  inv: ResolvedInventory,
  state: InventoryFilterState,
): ResolvedInventoryRow[] {
  const q = state.query.trim().toLowerCase();
  let rows = inv.rows.filter((row) => {
    const inUse = row.inUseCount ?? 0;
    if (state.tradableOnly && !row.marketTradable) return false;
    if (state.inUseOnly && inUse <= 0) return false;
    if (state.gradeFilter !== "ALL" && row.grade !== state.gradeFilter) return false;
    if (state.typeFilter !== "ALL" && row.type !== state.typeFilter) return false;
    if (state.locationFilter !== "ALL" && !rowMatchesLocation(row, state.locationFilter))
      return false;
    if (q && !row.name.toLowerCase().includes(q)) return false;
    return true;
  });

  const dir = state.sortDir === "asc" ? 1 : -1;
  rows = [...rows].sort((a, b) => {
    let cmp: number;
    if (state.sortKey === "name") cmp = a.name.localeCompare(b.name);
    else if (state.sortKey === "type") cmp = a.type.localeCompare(b.type);
    else if (state.sortKey === "level") cmp = (a.level ?? -1) - (b.level ?? -1);
    else if (state.sortKey === "count") cmp = a.count - b.count;
    else if (state.sortKey === "inUse") cmp = (a.inUseCount ?? 0) - (b.inUseCount ?? 0);
    else if (state.sortKey === "price") cmp = (a.unitPrice ?? -1) - (b.unitPrice ?? -1);
    else if (state.sortKey === "value") cmp = (a.value ?? -1) - (b.value ?? -1);
    else if (state.sortKey === "buyOrder") cmp = (a.buyOrderUnit ?? -1) - (b.buyOrderUnit ?? -1);
    else if (state.sortKey === "buyOrderValue")
      cmp = (a.buyOrderValue ?? -1) - (b.buyOrderValue ?? -1);
    else cmp = (GRADE_RANK[a.grade] ?? -1) - (GRADE_RANK[b.grade] ?? -1);
    if (cmp === 0) cmp = b.count - a.count;
    return cmp * dir;
  });
  return rows;
}

export function defaultSortDir(key: SortKey): "asc" | "desc" {
  return key === "name" || key === "type" || key === "level" ? "asc" : "desc";
}
