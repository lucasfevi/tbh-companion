import { describe, it, expect } from "vitest";
import {
  DEFAULT_VISIBLE_INVENTORY_COLUMNS,
  normalizeInventoryTablePrefs,
} from "../../src/core/inventory/columnPrefs";

describe("inventory column prefs", () => {
  it("returns defaults when prefs missing", () => {
    const prefs = normalizeInventoryTablePrefs(undefined);
    expect(prefs.visibleColumns).toEqual(DEFAULT_VISIBLE_INVENTORY_COLUMNS);
  });

  it("filters unknown column ids", () => {
    const prefs = normalizeInventoryTablePrefs({
      visibleColumns: ["grade", "not-a-column" as "grade", "marketPrice"],
    });
    expect(prefs.visibleColumns).toEqual(["grade", "marketPrice"]);
  });

  it("falls back to defaults when all columns filtered out", () => {
    const prefs = normalizeInventoryTablePrefs({
      visibleColumns: ["not-a-column" as "grade"],
    });
    expect(prefs.visibleColumns).toEqual(DEFAULT_VISIBLE_INVENTORY_COLUMNS);
  });
});
