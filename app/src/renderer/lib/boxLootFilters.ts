import { GRADE_ORDER, GRADE_RANK } from "../../core/grades";
import { stageName } from "../../core/stages";
import { itemDescriptor } from "./lookupDisplay";
import type {
  LookupBoxDrop,
  LookupBoxFirstDropStageRef,
  LookupBoxStageRef,
  LookupItem,
} from "../../../shared/types";

export type BoxLootSortKey = "dropPct" | "name" | "grade";
export type BoxStageSortKey = "spawnPct" | "name";

export interface BoxLootFilterState {
  query: string;
  gradeFilter: string[];
  typeFilter: string[];
  sortKey: BoxLootSortKey;
  sortDir: "asc" | "desc";
}

export interface BoxStageFilterState {
  query: string;
  sortKey: BoxStageSortKey;
  sortDir: "asc" | "desc";
}

function matchesMulti(selected: string[], value: string | null): boolean {
  return selected.length === 0 || (value != null && selected.includes(value));
}

export interface ResolvedBoxLoot {
  itemKey: number;
  dropPct: number;
  name: string;
  grade: string | null;
  item: LookupItem | null;
}

export function resolveBoxLoot(
  drops: LookupBoxDrop[],
  peekItem: (itemKey: number) => LookupItem | undefined,
): ResolvedBoxLoot[] {
  return drops.map((drop) => ({
    itemKey: drop.itemKey,
    dropPct: drop.dropPct,
    name: drop.name,
    grade: drop.grade,
    item: peekItem(drop.itemKey) ?? null,
  }));
}

export function filterAndSortBoxLoot(
  loot: ResolvedBoxLoot[],
  state: BoxLootFilterState,
): ResolvedBoxLoot[] {
  const q = state.query.trim().toLowerCase();
  let rows = loot.filter((row) => {
    if (!matchesMulti(state.gradeFilter, row.item?.grade ?? row.grade)) return false;
    if (state.typeFilter.length > 0) {
      const descriptor = row.item ? itemDescriptor(row.item) : null;
      if (!matchesMulti(state.typeFilter, descriptor)) return false;
    }
    if (q && !(row.item?.name ?? row.name).toLowerCase().includes(q)) return false;
    return true;
  });

  const dir = state.sortDir === "asc" ? 1 : -1;
  rows = [...rows].sort((a, b) => {
    let cmp: number;
    if (state.sortKey === "name") {
      cmp = (a.item?.name ?? a.name).localeCompare(b.item?.name ?? b.name);
    } else if (state.sortKey === "grade") {
      cmp =
        (GRADE_RANK[a.item?.grade ?? a.grade ?? ""] ?? -1) -
        (GRADE_RANK[b.item?.grade ?? b.grade ?? ""] ?? -1);
    } else {
      cmp = a.dropPct - b.dropPct;
    }
    if (cmp === 0 && state.sortKey !== "dropPct") cmp = a.dropPct - b.dropPct;
    return cmp * dir;
  });
  return rows;
}

export function stageMatchesQuery(stageKey: number, displayName: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const compact = stageName(stageKey).toLowerCase();
  const difficulty = compact.split(" ")[0] ?? "";
  return displayName.toLowerCase().includes(q) || compact.includes(q) || difficulty.includes(q);
}

export function filterFirstDropStages(
  stages: LookupBoxFirstDropStageRef[],
  query: string,
): LookupBoxFirstDropStageRef[] {
  return stages.filter((row) => stageMatchesQuery(row.stageKey, row.stageName, query));
}

export function filterAndSortBoxStages(
  stages: LookupBoxStageRef[],
  state: BoxStageFilterState,
): LookupBoxStageRef[] {
  const q = state.query.trim().toLowerCase();
  let rows = stages.filter((row) => stageMatchesQuery(row.stageKey, row.stageName, q));

  const dir = state.sortDir === "asc" ? 1 : -1;
  rows = [...rows].sort((a, b) => {
    let cmp: number;
    if (state.sortKey === "name") {
      cmp = a.stageName.localeCompare(b.stageName);
    } else {
      cmp = a.spawnPct - b.spawnPct;
    }
    if (cmp === 0 && state.sortKey !== "spawnPct") cmp = a.stageKey - b.stageKey;
    return cmp * dir;
  });
  return rows;
}

export function gradeOptionsFromBoxLoot(loot: ResolvedBoxLoot[]): string[] {
  const present = new Set(
    loot.flatMap((row) => [row.item?.grade ?? row.grade].filter(Boolean) as string[]),
  );
  const ordered = GRADE_ORDER.filter((g) => present.has(g));
  const extras = [...present].filter((g) => GRADE_RANK[g] === undefined).sort();
  return [...ordered, ...extras];
}
