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

/** Min/max spawnPct across farm stages (JSON already in %). */
export function summarizeSpawnPcts(
  stages: LookupBoxStageRef[],
): { min: number; max: number } | null {
  if (stages.length === 0) return null;
  const pcts = stages.map((s) => s.spawnPct);
  return { min: Math.min(...pcts), max: Math.max(...pcts) };
}

function isConsecutiveStageKey(prev: number, next: number): boolean {
  const delta = next - prev;
  return delta === 1 || delta === 92 || delta === 100;
}

function parseStageKey(key: number) {
  const k = Math.trunc(key);
  return {
    difficulty: Math.floor(k / 1000),
    act: Math.floor(k / 100) % 10,
    stage: k % 100,
  };
}

function formatStageKeyChunk(keys: number[]): string {
  if (keys.length === 0) return "";
  if (keys.length === 1) return stageName(keys[0]);

  const byAct = new Map<
    string,
    { diffName: string; difficulty: number; act: number; stages: number[] }
  >();
  for (const key of keys) {
    const { difficulty, act, stage } = parseStageKey(key);
    const diffName = stageName(key).split(" ")[0];
    const groupKey = `${difficulty}:${act}`;
    if (!byAct.has(groupKey)) byAct.set(groupKey, { diffName, difficulty, act, stages: [] });
    byAct.get(groupKey)!.stages.push(stage);
  }

  const parts: string[] = [];
  for (const { diffName, act, stages } of [...byAct.values()].sort(
    (a, b) => a.difficulty - b.difficulty || a.act - b.act,
  )) {
    stages.sort((x, y) => x - y);
    const min = stages[0];
    const max = stages[stages.length - 1];
    if (min === max) parts.push(`${diffName} ${act}-${min}`);
    else parts.push(`${diffName} ${act}-${min} – ${act}-${max}`);
  }

  return parts.join(" · ");
}

/** Compress sorted stage keys into a human range label (matches stage_boxes tracker). */
export function dropStageRangeLabel(stageKeys: number[]): string {
  const sorted = [...new Set(stageKeys.map((k) => Math.trunc(k)))]
    .filter((k) => k > 0)
    .sort((a, b) => a - b);
  if (sorted.length === 0) return "—";
  if (sorted.length === 1) return stageName(sorted[0]);

  const chunks: number[][] = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (isConsecutiveStageKey(prev, cur)) chunks[chunks.length - 1].push(cur);
    else chunks.push([cur]);
  }

  return chunks.map((chunk) => formatStageKeyChunk(chunk)).join(" · ");
}
