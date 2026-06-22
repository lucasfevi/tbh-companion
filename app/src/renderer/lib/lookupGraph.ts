import type { LookupSources } from "../../../shared/types";

/** Box names aren't stored on the box entity itself — derive from stage/item references. */
export function buildBoxNameIndex(sources: LookupSources): Map<number, string> {
  const names = new Map<number, string>();
  for (const stage of Object.values(sources.stages)) {
    for (const box of stage.boxes) {
      if (!names.has(box.boxItemKey)) names.set(box.boxItemKey, box.name);
    }
  }
  for (const item of Object.values(sources.items)) {
    for (const drop of item.drops) {
      if (!names.has(drop.boxItemKey)) names.set(drop.boxItemKey, drop.boxName);
    }
  }
  return names;
}

/** Stage names aren't stored on the stage entity itself — derive from box references. */
export function buildStageNameIndex(sources: LookupSources): Map<number, string> {
  const names = new Map<number, string>();
  for (const box of Object.values(sources.boxes)) {
    for (const stage of box.stages) {
      if (!names.has(stage.stageKey)) names.set(stage.stageKey, stage.stageName);
    }
  }
  return names;
}
