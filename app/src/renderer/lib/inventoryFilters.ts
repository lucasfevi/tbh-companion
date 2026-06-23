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
  | "buyOrderValue"
  | "buyOrderAverage";
/** A single storage location; the location filter holds a set of these ([] = all). */
export type LocationFilter = ItemLocation;

const LOCATION_FILTER_LABEL: Record<ItemLocation, string> = {
  inventory: "Inventory",
  stash: "Stash",
  trading: "Trading",
  equipped: "Equipped",
  unknown: "Unknown",
};

export function emptyInventoryFilterMessage(locationFilter: LocationFilter[]): string {
  if (locationFilter.length === 1) {
    return `No items in ${LOCATION_FILTER_LABEL[locationFilter[0]]}.`;
  }
  return "No items match these filters.";
}

export interface InventoryFilterState {
  query: string;
  tradableOnly: boolean;
  unequippedOnly: boolean;
  gradeFilter: string[];
  typeFilter: string[];
  locationFilter: LocationFilter[];
  sortKey: SortKey;
  sortDir: "asc" | "desc";
}

/** A multi-select with no selections means "no filter" (match everything). */
function matchesMulti(selected: string[], value: string | null): boolean {
  return selected.length === 0 || (value != null && selected.includes(value));
}

/** Average price per unit actually realized across the order-book levels used to fill the stack. */
export function buyOrderAverage(row: ResolvedInventoryRow): number | null {
  if (!row.buyOrderCoveredCount || row.buyOrderValue == null) return null;
  return row.buyOrderValue / row.buyOrderCoveredCount;
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
    // Rows are grouped by item type, so a row can mix equipped + stashed copies.
    // Only hide it when every copy is equipped — otherwise the unequipped ones disappear too.
    if (state.unequippedOnly && inUse >= row.count) return false;
    if (!matchesMulti(state.gradeFilter, row.grade)) return false;
    if (!matchesMulti(state.typeFilter, row.type)) return false;
    if (
      state.locationFilter.length > 0 &&
      !state.locationFilter.some((location) => rowMatchesLocation(row, location))
    ) {
      return false;
    }
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
    else if (state.sortKey === "buyOrderAverage")
      cmp = (buyOrderAverage(a) ?? -1) - (buyOrderAverage(b) ?? -1);
    else cmp = (GRADE_RANK[a.grade] ?? -1) - (GRADE_RANK[b.grade] ?? -1);
    if (cmp === 0) cmp = b.count - a.count;
    return cmp * dir;
  });
  return rows;
}

export function defaultSortDir(key: SortKey): "asc" | "desc" {
  return key === "name" || key === "type" || key === "level" ? "asc" : "desc";
}
