// Game item catalog: maps the save's numeric ItemKey to name/grade/type/level.
//
// Source: tbh.city/items embeds a complete item dataset as JSON inside its
// server-rendered page. Gear level comes from tbh.city item detail pages
// (one lookup per unique icon template). See docs/findings/item-mapping.md.

export interface GameItem {
  id: number; // == save itemSaveDatas[].ItemKey
  name: string;
  grade: string; // COMMON..COSMIC
  type: string; // GEAR | MATERIAL
  level: number | null; // gear item level; null for materials / unknown
  marketTradable: boolean;
}

export interface GameData {
  source: string;
  fetchedUtc: string;
  count: number;
  items: GameItem[];
}

/** Raw row from the tbh.city/items list scrape (icon used only to resolve level). */
export interface RawScrapedItem {
  id: number;
  name: string;
  grade: string;
  type: string;
  icon: string;
  marketTradable: boolean;
}

interface RawListItem {
  id: number;
  name?: { en?: string };
  grade?: string;
  type?: string;
  icon?: string;
  is_market_tradable?: boolean;
}

const DETAIL_LEVEL_RE = /Level\\":(\d+),\\"IsSteamItem/;

export function iconTemplateFromPath(iconPath: string): string {
  const base = iconPath.split("/").pop() ?? iconPath;
  return base.replace(/\.png$/i, "");
}

export function extractLevelFromDetailHtml(html: string): number | null {
  const m = html.match(DETAIL_LEVEL_RE);
  return m ? Number(m[1]) : null;
}

function normalizeRaw(r: RawListItem): RawScrapedItem {
  return {
    id: r.id,
    name: r.name?.en ?? `#${r.id}`,
    grade: r.grade ?? "UNKNOWN",
    type: r.type ?? "UNKNOWN",
    icon: r.icon ?? "",
    marketTradable: Boolean(r.is_market_tradable),
  };
}

/** Parse the embedded item array from a tbh.city/items HTML page. */
export function parseRawItemsFromHtml(html: string): RawScrapedItem[] {
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

  const arr = JSON.parse(u.slice(start, end + 1)) as RawListItem[];
  return arr.filter((r) => typeof r?.id === "number").map(normalizeRaw);
}

export function buildGameItems(
  raw: RawScrapedItem[],
  levelsByTemplate: ReadonlyMap<string, number>,
): GameItem[] {
  return raw.map((r) => ({
    id: r.id,
    name: r.name,
    grade: r.grade,
    type: r.type,
    marketTradable: r.marketTradable,
    level:
      r.type === "GEAR" && r.icon
        ? (levelsByTemplate.get(iconTemplateFromPath(r.icon)) ?? null)
        : null,
  }));
}

/** Sync extract for tests; levels default to null unless a template map is passed. */
export function extractItemsFromHtml(
  html: string,
  levelsByTemplate: ReadonlyMap<string, number> = new Map(),
): GameItem[] {
  return buildGameItems(parseRawItemsFromHtml(html), levelsByTemplate);
}

export async function fetchLevelForItemId(itemId: number): Promise<number | null> {
  const res = await fetch(`https://tbh.city/items/${itemId}`, {
    headers: { "User-Agent": "Mozilla/5.0 (TBH Companion)" },
  });
  if (!res.ok) return null;
  return extractLevelFromDetailHtml(await res.text());
}

export async function fetchLevelsByTemplate(
  raw: RawScrapedItem[],
  existing: ReadonlyMap<string, number> = new Map(),
  concurrency = 8,
): Promise<Map<string, number>> {
  const levels = new Map(existing);
  const sampleByTemplate = new Map<string, number>();

  for (const item of raw) {
    if (item.type !== "GEAR" || !item.icon) continue;
    const template = iconTemplateFromPath(item.icon);
    if (!template || levels.has(template)) continue;
    if (!sampleByTemplate.has(template)) sampleByTemplate.set(template, item.id);
  }

  const pending = [...sampleByTemplate.entries()];
  for (let i = 0; i < pending.length; i += concurrency) {
    const batch = pending.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async ([template, id]) => {
        const level = await fetchLevelForItemId(id);
        if (level != null) levels.set(template, level);
      }),
    );
  }

  return levels;
}

export async function extractAndEnrichItemsFromHtml(
  html: string,
  existingLevels: ReadonlyMap<string, number> = new Map(),
): Promise<{ items: GameItem[]; levelsByTemplate: Map<string, number> }> {
  const raw = parseRawItemsFromHtml(html);
  const levelsByTemplate = await fetchLevelsByTemplate(raw, existingLevels);
  return { items: buildGameItems(raw, levelsByTemplate), levelsByTemplate };
}

export function indexById(items: GameItem[]): Map<number, GameItem> {
  const m = new Map<number, GameItem>();
  for (const it of items) m.set(it.id, it);
  return m;
}

/** True when at least one gear row carries a resolved item level. */
export function catalogHasGearLevels(items: Iterable<GameItem>): boolean {
  for (const item of items) {
    if (item.type === "GEAR" && item.level != null) return true;
  }
  return false;
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
