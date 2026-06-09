// Game item catalog: maps the save's numeric ItemKey to name/grade/type/icon.
//
// Source: tbh.city/items embeds a complete item dataset as JSON inside its
// server-rendered page. Each record's `id` equals the save's `ItemKey` (see
// docs/findings/item-mapping.md). This module holds the framework-free parsing
// + indexing; fetching/caching lives in main/gameDataProvider.ts.

export interface GameItem {
  id: number; // == save itemSaveDatas[].ItemKey
  name: string;
  grade: string; // COMMON..COSMIC
  type: string; // GEAR | MATERIAL
  icon: string; // relative sprite path
  gearId: string; // gear variant id (empty for materials)
  marketTradable: boolean;
}

export interface GameData {
  source: string;
  fetchedUtc: string;
  count: number;
  items: GameItem[];
}

interface RawItem {
  id: number;
  name?: { en?: string };
  grade?: string;
  type?: string;
  icon?: string;
  gear_id?: string;
  is_market_tradable?: boolean;
}

function normalize(r: RawItem): GameItem {
  return {
    id: r.id,
    name: r.name?.en ?? `#${r.id}`,
    grade: r.grade ?? "UNKNOWN",
    type: r.type ?? "UNKNOWN",
    icon: r.icon ?? "",
    gearId: r.gear_id ?? "",
    marketTradable: Boolean(r.is_market_tradable),
  };
}

/**
 * Extract the embedded item array from a tbh.city/items HTML page.
 * The data lives in the RSC stream as escaped JSON, so we unescape, locate the
 * `[{"id":...}]` array, bracket-match its end, and parse it.
 */
export function extractItemsFromHtml(html: string): GameItem[] {
  const u = html.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  const start = u.indexOf('[{"id":');
  if (start < 0) throw new Error("item array not found in page");

  let depth = 0;
  let end = -1;
  for (let i = start; i < u.length; i++) {
    const c = u[i];
    if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) throw new Error("unterminated item array in page");

  const arr = JSON.parse(u.slice(start, end + 1)) as RawItem[];
  return arr.filter((r) => typeof r?.id === "number").map(normalize);
}

export function indexById(items: GameItem[]): Map<number, GameItem> {
  const m = new Map<number, GameItem>();
  for (const it of items) m.set(it.id, it);
  return m;
}
