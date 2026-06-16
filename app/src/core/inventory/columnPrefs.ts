import type { InventoryColumnId, InventoryTablePrefs } from "../../../shared/types";

export const INVENTORY_COLUMN_IDS: InventoryColumnId[] = [
  "grade",
  "level",
  "type",
  "location",
  "inUse",
  "marketPrice",
  "listValue",
  "instantSell",
  "instantTotal",
];

export const DEFAULT_VISIBLE_INVENTORY_COLUMNS: InventoryColumnId[] = [
  "grade",
  "level",
  "type",
  "location",
  "inUse",
  "marketPrice",
  "listValue",
  "instantSell",
  "instantTotal",
];

export function normalizeInventoryTablePrefs(
  prefs: InventoryTablePrefs | undefined,
): InventoryTablePrefs {
  const raw = prefs?.visibleColumns ?? DEFAULT_VISIBLE_INVENTORY_COLUMNS;
  const allowed = new Set(INVENTORY_COLUMN_IDS);
  const visibleColumns = raw.filter((id) => allowed.has(id));
  if (visibleColumns.length === 0) {
    return { visibleColumns: [...DEFAULT_VISIBLE_INVENTORY_COLUMNS] };
  }
  return { visibleColumns };
}

export function isInventoryColumnVisible(
  prefs: InventoryTablePrefs | undefined,
  id: InventoryColumnId,
): boolean {
  return normalizeInventoryTablePrefs(prefs).visibleColumns.includes(id);
}
