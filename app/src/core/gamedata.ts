// Game item catalog: maps the save's numeric ItemKey to name/grade/type/level.
//
// Bundled in data/gamedata.json (updated via tbh-data release workflow).

/** Neutral label stored in bundled JSON metadata. */
export const CATALOG_SOURCE = "companion-item-catalog";

export interface GameItem {
  id: number; // == save itemSaveDatas[].ItemKey
  name: string;
  grade: string; // COMMON..COSMIC
  type: string; // GEAR | MATERIAL | STAGEBOX | ...
  level: number | null; // gear item level; null for materials / unknown
  marketTradable: boolean;
}

export interface GameData {
  source: string;
  fetchedUtc: string;
  count: number;
  items: GameItem[];
}

export function indexById(items: GameItem[]): Map<number, GameItem> {
  const m = new Map<number, GameItem>();
  for (const it of items) m.set(it.id, it);
  return m;
}

/** Save ItemKeys in the bundled catalog range (gear, materials, stage boxes). */
const SAVE_CATALOG_ITEM_KEY_MIN = 110_001;
const SAVE_CATALOG_ITEM_KEY_MAX = 939_999;

/**
 * Map a save `itemSaveDatas[].ItemKey` to the catalog `id`.
 * Newer game builds append a 3-digit suffix (commonly `900`) so keys look like
 * `514051900` instead of `514051`.
 */
export function catalogItemKeyFromSave(itemKey: number): number {
  if (itemKey < 1_000_000) return itemKey;
  const base = Math.trunc(itemKey / 1000);
  if (base >= SAVE_CATALOG_ITEM_KEY_MIN && base <= SAVE_CATALOG_ITEM_KEY_MAX) return base;
  return itemKey;
}

/** Normalize a catalog row loaded from JSON (tolerates legacy icon/gearId fields). */
export function normalizeGameItem(raw: Record<string, unknown>): GameItem | null {
  const id = Number(raw.id);
  if (!Number.isFinite(id)) return null;
  const levelRaw = raw.level;
  return {
    id,
    name: String(raw.name ?? `#${id}`),
    grade: String(raw.grade ?? "UNKNOWN"),
    type: String(raw.type ?? "UNKNOWN"),
    level:
      levelRaw === null || levelRaw === undefined
        ? null
        : Number.isFinite(Number(levelRaw))
          ? Number(levelRaw)
          : null,
    marketTradable: Boolean(raw.marketTradable ?? raw.is_market_tradable),
  };
}
