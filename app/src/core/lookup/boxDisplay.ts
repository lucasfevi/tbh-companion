import { stageName } from "../stages";
import type { LookupBoxCategory, LookupBoxDropVia, LookupBoxStageRef } from "./types";

export const FIRST_DROP_ONLY_LABEL = "First clear only";

/** Compact stage key plus map name for box detail stage rows. */
export function boxStageListLabel(stageKey: number, displayName: string): string {
  return `${stageName(stageKey)} - ${displayName}`;
}

export function boxCategoryLabel(category: LookupBoxCategory): string {
  switch (category) {
    case "common":
      return "Common chest";
    case "stage_boss":
      return "Stage boss chest";
    case "act_boss":
      return "Act boss chest";
    default:
      return "Chest";
  }
}

export function boxDropViaLabel(via: LookupBoxDropVia): string {
  switch (via) {
    case "monster_box":
      return "Monster kill";
    case "boss_box":
      return "Stage boss kill";
    case "act_boss":
      return "Act boss kill";
  }
}

/** Split tbh-data `dropStageRangeLabel` into one line per range chunk. */
export function splitDropStageRangeLines(label: string): string[] {
  const trimmed = label.trim();
  if (!trimmed || trimmed === "—") return [];
  return trimmed
    .split(" · ")
    .map((part) => part.trim())
    .filter(Boolean);
}

export interface BoxDropViaSummary {
  via: LookupBoxDropVia;
  label: string;
  minPct: number;
  maxPct: number;
}

const DROP_VIA_ORDER: LookupBoxDropVia[] = ["monster_box", "boss_box", "act_boss"];

/** Group farm stages by kill type with min/max spawn % per via. */
export function boxDropViaSummaries(stages: LookupBoxStageRef[]): BoxDropViaSummary[] {
  const buckets = new Map<LookupBoxDropVia, number[]>();
  for (const stage of stages) {
    const pcts = buckets.get(stage.via) ?? [];
    pcts.push(stage.spawnPct);
    buckets.set(stage.via, pcts);
  }

  return DROP_VIA_ORDER.filter((via) => buckets.has(via)).map((via) => {
    const pcts = buckets.get(via)!;
    return {
      via,
      label: boxDropViaLabel(via),
      minPct: Math.min(...pcts),
      maxPct: Math.max(...pcts),
    };
  });
}

/** Min/max spawnPct across farm stages (JSON already in %). */
export function summarizeSpawnPcts(
  stages: LookupBoxStageRef[],
): { min: number; max: number } | null {
  if (stages.length === 0) return null;
  const pcts = stages.map((s) => s.spawnPct);
  return { min: Math.min(...pcts), max: Math.max(...pcts) };
}
