// Stage box ItemKeys from taskbarhero.wiki/stage-boxes (59 entries).
// Used to exclude loot chests from the inventory tab — they are not gear/materials.

import type { GameItem } from "./gamedata";
import { loadStageBoxCatalogFile } from "./stageBoxTracker";

export interface StageBoxCatalog {
  count: number;
  items: GameItem[];
}

export function buildStageBoxCatalog(): StageBoxCatalog {
  const file = loadStageBoxCatalogFile();
  return {
    count: file.count,
    items: file.items.map(({ obtainable: _o, tracker: _t, ...item }) => item),
  };
}

export function stageBoxIdSet(
  items: Iterable<GameItem> = buildStageBoxCatalog().items,
): ReadonlySet<number> {
  return new Set([...items].map((i) => i.id));
}

export function isStageBoxItemKey(itemKey: number, ids: ReadonlySet<number>): boolean {
  return ids.has(itemKey);
}
