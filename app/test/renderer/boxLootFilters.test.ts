import { describe, expect, it } from "vitest";
import {
  filterAndSortBoxStages,
  filterFirstDropStages,
  stageMatchesQuery,
} from "../../src/renderer/lib/boxLootFilters";
import type { LookupBoxFirstDropStageRef, LookupBoxStageRef } from "../../shared/types";

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

describe("boxLootFilters stage search", () => {
  it("matches display name, compact key, and difficulty", () => {
    expect(stageMatchesQuery(1101, "Pasture", "pasture")).toBe(true);
    expect(stageMatchesQuery(1103, "Wasteland", "wasteland")).toBe(true);
    expect(stageMatchesQuery(1101, "Pasture", "normal 1-1")).toBe(true);
    expect(stageMatchesQuery(1101, "Pasture", "normal")).toBe(true);
    expect(stageMatchesQuery(4210, tormentStage.stageName, "torment")).toBe(true);
    expect(stageMatchesQuery(4210, tormentStage.stageName, "2-10")).toBe(true);
    expect(stageMatchesQuery(1101, "Pasture", "torment")).toBe(false);
  });

  it("filters farm and first-clear stage lists", () => {
    const farm = filterAndSortBoxStages([pasture, tormentStage], {
      query: "torment",
      sortKey: "spawnPct",
      sortDir: "desc",
    });
    expect(farm).toEqual([tormentStage]);

    const first: LookupBoxFirstDropStageRef[] = [
      { stageKey: 1101, stageName: "Pasture" },
      { stageKey: 4210, stageName: "Act End" },
    ];
    expect(filterFirstDropStages(first, "normal")).toEqual([first[0]]);
  });
});
