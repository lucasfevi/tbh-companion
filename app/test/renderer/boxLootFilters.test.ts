import { describe, expect, it } from "vitest";
import {
  filterAndSortBoxLoot,
  filterAndSortBoxStages,
  filterFirstDropStages,
  gradeOptionsFromBoxLoot,
  resolveBoxLoot,
  stageMatchesQuery,
  type ResolvedBoxLoot,
} from "../../src/renderer/lib/boxLootFilters";
import type {
  LookupBoxDrop,
  LookupBoxFirstDropStageRef,
  LookupBoxStageRef,
} from "../../shared/types";
import type { LookupItem } from "../../shared/types";

const pasture: LookupBoxStageRef = {
  stageKey: 1101,
  stageName: "Pasture",
  via: "boss_box",
  spawnPct: 100,
};

const tormentStage: LookupBoxStageRef = {
  stageKey: 4210,
  stageName: "Some Long Act Boss Stage Name That Should Not Be Required",
  via: "act_boss",
  spawnPct: 100,
};

function gear(id: number, name: string, grade: string): LookupItem {
  return {
    id,
    name,
    grade,
    type: "GEAR",
    gearType: "SWORD",
    gearGroup: "WEAPON",
    materialType: null,
    level: 1,
    iconPath: `ICON_${id}`,
    marketTradable: true,
    stats: { base: [], inherent: [], unique: null },
  };
}

const sword = gear(300001, "Long Sword", "COMMON");
const bow = gear(1, "Limitless Bow", "LEGENDARY");

const catalog = new Map<number, LookupItem>([
  [300001, sword],
  [1, bow],
]);

const lootDrops: LookupBoxDrop[] = [
  { itemKey: 300001, name: "Long Sword", grade: "COMMON", dropPct: 100 },
  { itemKey: 1, name: "Limitless Bow", grade: "LEGENDARY", dropPct: 0.5 },
];

const resolved = resolveBoxLoot(lootDrops, (key) => catalog.get(key));

describe("stageMatchesQuery", () => {
  it("matches display name, compact key, and difficulty", () => {
    expect(stageMatchesQuery(1101, "Pasture", "pasture")).toBe(true);
    expect(stageMatchesQuery(1103, "Wasteland", "wasteland")).toBe(true);
    expect(stageMatchesQuery(1101, "Pasture", "normal 1-1")).toBe(true);
    expect(stageMatchesQuery(1101, "Pasture", "normal")).toBe(true);
    expect(stageMatchesQuery(4210, tormentStage.stageName, "torment")).toBe(true);
    expect(stageMatchesQuery(4210, tormentStage.stageName, "2-10")).toBe(true);
    expect(stageMatchesQuery(1101, "Pasture", "torment")).toBe(false);
  });
});

describe("filterFirstDropStages", () => {
  it("filters first-clear stage lists by search query", () => {
    const first: LookupBoxFirstDropStageRef[] = [
      { stageKey: 1101, stageName: "Pasture" },
      { stageKey: 4210, stageName: "Act End" },
    ];
    expect(filterFirstDropStages(first, "normal")).toEqual([first[0]]);
  });
});

describe("filterAndSortBoxStages", () => {
  it("filters farm stages by search query", () => {
    const farm = filterAndSortBoxStages([pasture, tormentStage], {
      query: "torment",
      sortKey: "spawnPct",
      sortDir: "desc",
    });
    expect(farm).toEqual([tormentStage]);
  });

  it("sorts by spawn % descending with stage key tie-break", () => {
    const low = { ...pasture, stageKey: 1102, spawnPct: 40 };
    const high = { ...pasture, stageKey: 1103, spawnPct: 80 };
    const rows = filterAndSortBoxStages([low, high], {
      query: "",
      sortKey: "spawnPct",
      sortDir: "desc",
    });
    expect(rows.map((r) => r.stageKey)).toEqual([1103, 1102]);
  });

  it("sorts by stage name ascending", () => {
    const alpha = { ...pasture, stageName: "Alpha" };
    const beta = { ...pasture, stageKey: 1102, stageName: "Beta" };
    const rows = filterAndSortBoxStages([beta, alpha], {
      query: "",
      sortKey: "name",
      sortDir: "asc",
    });
    expect(rows.map((r) => r.stageName)).toEqual(["Alpha", "Beta"]);
  });
});

describe("resolveBoxLoot", () => {
  it("joins catalog items when present", () => {
    expect(resolved[0]?.item).toBe(sword);
    expect(resolved[0]?.name).toBe("Long Sword");
  });

  it("leaves item null when not in catalog", () => {
    const orphan = resolveBoxLoot(
      [{ itemKey: 999, name: "Missing", grade: null, dropPct: 1 }],
      () => undefined,
    );
    expect(orphan[0]?.item).toBeNull();
    expect(orphan[0]?.name).toBe("Missing");
  });
});

describe("filterAndSortBoxLoot", () => {
  it("sorts by drop % descending by default", () => {
    const rows = filterAndSortBoxLoot(resolved, {
      query: "",
      gradeFilter: [],
      typeFilter: [],
      sortKey: "dropPct",
      sortDir: "desc",
    });
    expect(rows.map((r) => r.itemKey)).toEqual([300001, 1]);
  });

  it("filters by search query on item name", () => {
    const rows = filterAndSortBoxLoot(resolved, {
      query: "bow",
      gradeFilter: [],
      typeFilter: [],
      sortKey: "dropPct",
      sortDir: "desc",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.itemKey).toBe(1);
  });

  it("sorts by grade rank descending", () => {
    const rows = filterAndSortBoxLoot(resolved, {
      query: "",
      gradeFilter: [],
      typeFilter: [],
      sortKey: "grade",
      sortDir: "desc",
    });
    expect(rows[0]?.itemKey).toBe(1);
  });
});

describe("gradeOptionsFromBoxLoot", () => {
  it("lists present grades in rank order", () => {
    const loot: ResolvedBoxLoot[] = [
      { itemKey: 1, dropPct: 1, name: "A", grade: "LEGENDARY", item: bow },
      { itemKey: 2, dropPct: 1, name: "B", grade: "COMMON", item: sword },
    ];
    expect(gradeOptionsFromBoxLoot(loot)).toEqual(["COMMON", "LEGENDARY"]);
  });
});
