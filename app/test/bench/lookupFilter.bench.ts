import { bench, describe } from "vitest";
import { loadLookupItems } from "../../src/core/lookup/catalog";
import { filterAndSortItems, LEVEL_MIN, LEVEL_MAX } from "../../src/renderer/lib/lookupFilters";

const items = loadLookupItems();

const baseState = {
  query: "",
  typeFilter: [] as string[],
  gradeFilter: [] as string[],
  gearTypeFilter: [] as string[],
  materialKindFilter: [] as string[],
  effectFilter: [] as string[],
  uniqueOnly: false,
  levelRange: [LEVEL_MIN, LEVEL_MAX] as [number, number],
  sortKey: "name" as const,
  sortDir: "asc" as const,
};

describe("lookup filter/sort", () => {
  bench("no filters, sort by name (full catalog)", () => {
    filterAndSortItems(items, baseState);
  });

  bench("query filter — partial name match", () => {
    filterAndSortItems(items, { ...baseState, query: "iron" });
  });

  bench("multi-select filter — type + grade", () => {
    filterAndSortItems(items, {
      ...baseState,
      typeFilter: ["GEAR"],
      gradeFilter: ["Rare", "Epic"],
    });
  });

  bench("combined filter + sort by grade", () => {
    filterAndSortItems(items, {
      ...baseState,
      query: "sword",
      typeFilter: ["GEAR"],
      sortKey: "grade",
      sortDir: "desc",
    });
  });
});
