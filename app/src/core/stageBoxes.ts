// Stage box ItemKeys from taskbarhero.wiki/stage-boxes (59 entries).
// Used to exclude loot chests from the inventory tab — they are not gear/materials.

import type { GameItem } from "./gamedata";

export interface StageBoxCatalog {
  count: number;
  items: GameItem[];
}

function levelFromName(name: string): number | null {
  const lv = name.match(/\bLv\s*(\d+)\b/i);
  if (lv) return Number(lv[1]);
  const num = name.match(/ Box (\d+)$/);
  return num ? Number(num[1]) : null;
}

/** Canonical list synced with https://taskbarhero.wiki/stage-boxes */
const STAGE_BOX_ENTRIES: { id: number; name: string; grade: string }[] = [
  { id: 910011, name: "Normal Monster Box 1", grade: "COMMON" },
  { id: 910051, name: "Normal Monster Box 2", grade: "COMMON" },
  { id: 910101, name: "Normal Monster Box 3", grade: "COMMON" },
  { id: 910151, name: "Normal Monster Box Lv15", grade: "COMMON" },
  { id: 910201, name: "Normal Monster Box Lv20", grade: "COMMON" },
  { id: 910251, name: "Normal Monster Box Lv25", grade: "COMMON" },
  { id: 910301, name: "Normal Monster Box Lv30", grade: "COMMON" },
  { id: 910351, name: "Normal Monster Box Lv35", grade: "COMMON" },
  { id: 910401, name: "Normal Monster Box Lv40", grade: "COMMON" },
  { id: 910451, name: "Normal Monster Box Lv45", grade: "COMMON" },
  { id: 910501, name: "Normal Monster Box Lv50", grade: "COMMON" },
  { id: 910551, name: "Normal Monster Box Lv55", grade: "COMMON" },
  { id: 910601, name: "Normal Monster Box Lv60", grade: "COMMON" },
  { id: 910651, name: "Normal Monster Box Lv65", grade: "COMMON" },
  { id: 910701, name: "Normal Monster Box Lv70", grade: "COMMON" },
  { id: 910751, name: "Normal Monster Box Lv75", grade: "COMMON" },
  { id: 910801, name: "Normal Monster Box Lv80", grade: "COMMON" },
  { id: 910851, name: "Normal Monster Box Lv85", grade: "COMMON" },
  { id: 910901, name: "Normal Monster Box Lv90", grade: "COMMON" },
  { id: 920001, name: "Stage Boss Box 1", grade: "RARE" },
  { id: 920002, name: "Stage Boss Box 2", grade: "RARE" },
  { id: 920003, name: "Stage Boss Box 3", grade: "RARE" },
  { id: 920004, name: "Stage Boss Box 3", grade: "RARE" },
  { id: 920005, name: "Stage Boss Box 3", grade: "RARE" },
  { id: 920006, name: "Stage Boss Box 3", grade: "RARE" },
  { id: 920011, name: "Stage Boss Box 4", grade: "RARE" },
  { id: 920051, name: "Stage Boss Box 5", grade: "RARE" },
  { id: 920022, name: "Stage Boss Box 6", grade: "RARE" },
  { id: 920032, name: "Stage Boss Box 6", grade: "RARE" },
  { id: 920042, name: "Stage Boss Box 6", grade: "RARE" },
  { id: 920052, name: "Stage Boss Box 6", grade: "RARE" },
  { id: 920101, name: "Stage Boss Box 7", grade: "RARE" },
  { id: 920151, name: "Stage Boss Box Lv15", grade: "RARE" },
  { id: 920201, name: "Stage Boss Box Lv20", grade: "RARE" },
  { id: 920251, name: "Stage Boss Box Lv25", grade: "RARE" },
  { id: 920301, name: "Stage Boss Box Lv30", grade: "RARE" },
  { id: 920351, name: "Stage Boss Box Lv35", grade: "RARE" },
  { id: 920401, name: "Stage Boss Box Lv40", grade: "RARE" },
  { id: 920451, name: "Stage Boss Box Lv45", grade: "RARE" },
  { id: 920501, name: "Stage Boss Box Lv50", grade: "RARE" },
  { id: 920551, name: "Stage Boss Box Lv55", grade: "RARE" },
  { id: 920601, name: "Stage Boss Box Lv60", grade: "RARE" },
  { id: 920651, name: "Stage Boss Box Lv65", grade: "RARE" },
  { id: 920701, name: "Stage Boss Box Lv70", grade: "RARE" },
  { id: 920751, name: "Stage Boss Box Lv75", grade: "RARE" },
  { id: 920801, name: "Stage Boss Box Lv80", grade: "RARE" },
  { id: 920851, name: "Stage Boss Box Lv85", grade: "RARE" },
  { id: 920901, name: "Stage Boss Box Lv90", grade: "RARE" },
  { id: 930101, name: "Act Boss Box 1", grade: "LEGENDARY" },
  { id: 930201, name: "Act Boss Box Lv20", grade: "LEGENDARY" },
  { id: 930301, name: "Act Boss Box Lv30", grade: "LEGENDARY" },
  { id: 930401, name: "Act Boss Box Lv40", grade: "LEGENDARY" },
  { id: 930451, name: "Act Boss Box Lv45", grade: "LEGENDARY" },
  { id: 930501, name: "Act Boss Box Lv50", grade: "LEGENDARY" },
  { id: 930601, name: "Act Boss Box Lv60", grade: "LEGENDARY" },
  { id: 930651, name: "Act Boss Box Lv65", grade: "LEGENDARY" },
  { id: 930701, name: "Act Boss Box Lv70", grade: "LEGENDARY" },
  { id: 930851, name: "Act Boss Box Lv85", grade: "LEGENDARY" },
  { id: 930901, name: "Act Boss Box Lv90", grade: "LEGENDARY" },
];

export function buildStageBoxCatalog(): StageBoxCatalog {
  const items: GameItem[] = STAGE_BOX_ENTRIES.map(({ id, name, grade }) => ({
    id,
    name,
    grade,
    type: "STAGEBOX",
    level: levelFromName(name),
    marketTradable: false,
  }));
  return { count: items.length, items };
}

export function stageBoxIdSet(items: Iterable<GameItem> = buildStageBoxCatalog().items): ReadonlySet<number> {
  return new Set([...items].map((i) => i.id));
}

export function isStageBoxItemKey(itemKey: number, ids: ReadonlySet<number>): boolean {
  return ids.has(itemKey);
}
