import type { ItemLocation, ResolvedInventoryRow } from "../../../shared/types";

export function unassignedCount(row: ResolvedInventoryRow): number {
  const inUse = row.inUseCount ?? 0;
  return (
    row.count -
    (row.inventoryCount ?? 0) -
    (row.stashCount ?? 0) -
    (row.tradingCount ?? 0) -
    inUse
  );
}

export function rowMatchesLocation(row: ResolvedInventoryRow, filter: ItemLocation): boolean {
  const inUse = row.inUseCount ?? 0;
  switch (filter) {
    case "equipped":
      return inUse > 0;
    case "inventory":
      return (row.inventoryCount ?? 0) > 0;
    case "stash":
      return (row.stashCount ?? 0) > 0;
    case "trading":
      return (row.tradingCount ?? 0) > 0;
    case "unknown":
      return unassignedCount(row) > 0;
    default:
      return true;
  }
}

export function rowMatchesAnyLocation(rows: ResolvedInventoryRow[], filter: ItemLocation): boolean {
  return rows.some((r) => rowMatchesLocation(r, filter));
}
