// Parse the save's owned items + held chests into a framework-free snapshot.
//
// Owned items come from PlayerSaveData.itemSaveDatas. UniqueId exceeds JS's
// safe-integer range, so slot refs and item triples are read from the inner
// PlayerSaveData JSON string (digits preserved as text).

import { unwrapEs3Entry } from "./saveReader";
import type { GameItem } from "./gamedata";
import { marketHashMatch, steamMarketNames } from "./marketName";
import type {
  InventoryItemInstance,
  ItemLocation,
  ChestHolding,
  InventorySnapshot,
  ResolvedInventory,
  ResolvedInventoryRow,
  InventoryComposition,
  InventoryPriceInfo,
} from "../../shared/types";

function toNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function sliceJsonArray(text: string, key: string): string {
  const at = text.indexOf(key);
  if (at === -1) return "";
  const open = text.indexOf("[", at);
  if (open === -1) return "";
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) return text.slice(open, i + 1);
    }
  }
  return "";
}

function parseEquippedIds(playerStr: string): Set<string> {
  const equipped = new Set<string>();
  const re = /"equippedItemIds"\s*:\s*\[([^\]]*)\]/g;
  for (const m of playerStr.matchAll(re)) {
    for (const id of m[1].split(",").map((s) => s.trim()).filter(Boolean)) {
      equipped.add(id);
    }
  }
  return equipped;
}

const SLOT_ID_RE = /"ItemUniqueId"\s*:\s*(\d+)/g;

function parseSlotUniqueIds(playerStr: string, arrayKey: string): Set<string> {
  const arr = sliceJsonArray(playerStr, arrayKey);
  const ids = new Set<string>();
  for (const m of arr.matchAll(SLOT_ID_RE)) {
    const id = m[1];
    if (id !== "0") ids.add(id);
  }
  return ids;
}

const ITEM_TRIPLE_RE =
  /"ItemKey"\s*:\s*(\d+)\s*,\s*"UniqueId"\s*:\s*(\d+)\s*,\s*"IsChaotic"\s*:\s*(true|false)/g;

function resolveLocation(
  uniqueId: string,
  equipped: Set<string>,
  inventory: Set<string>,
  stash: Set<string>,
  trading: Set<string>,
): ItemLocation {
  if (equipped.has(uniqueId)) return "equipped";
  if (inventory.has(uniqueId)) return "inventory";
  if (stash.has(uniqueId)) return "stash";
  if (trading.has(uniqueId)) return "trading";
  return "unknown";
}

function parseItemsFromPlayerString(playerStr: string): InventoryItemInstance[] {
  const equipped = parseEquippedIds(playerStr);
  const inventory = parseSlotUniqueIds(playerStr, '"inventorySaveDatas":');
  const stash = parseSlotUniqueIds(playerStr, '"stashSaveDatas":');
  const trading = parseSlotUniqueIds(playerStr, '"tradingStashSaveDatas":');
  const arr = sliceJsonArray(playerStr, '"itemSaveDatas":');
  const items: InventoryItemInstance[] = [];
  for (const m of arr.matchAll(ITEM_TRIPLE_RE)) {
    const itemKey = Math.trunc(Number(m[1]));
    if (itemKey <= 0) continue;
    const uniqueId = m[2];
    const location = resolveLocation(uniqueId, equipped, inventory, stash, trading);
    items.push({
      itemKey,
      isChaotic: m[3] === "true",
      inUse: equipped.has(uniqueId),
      location,
    });
  }
  return items;
}

function parseItemsFromPlayerObject(player: Record<string, unknown>): InventoryItemInstance[] {
  const items: InventoryItemInstance[] = [];
  const arr = player.itemSaveDatas;
  if (!Array.isArray(arr)) return items;
  for (const raw of arr) {
    if (!raw || typeof raw !== "object") continue;
    const it = raw as Record<string, unknown>;
    const itemKey = Math.trunc(toNum(it.ItemKey, 0));
    if (itemKey <= 0) continue;
    items.push({
      itemKey,
      isChaotic: Boolean(it.IsChaotic),
      inUse: false,
      location: "unknown",
    });
  }
  return items;
}

export function parseInventory(decryptedText: string, saveMtime = 0): InventorySnapshot {
  const root = JSON.parse(decryptedText) as Record<string, unknown>;
  const playerEntry = root?.PlayerSaveData as { value?: unknown } | undefined;
  const playerStr = typeof playerEntry?.value === "string" ? playerEntry.value : null;
  const player = unwrapEs3Entry(root?.PlayerSaveData) as Record<string, unknown> | undefined;

  let items: InventoryItemInstance[] = [];
  if (playerStr) {
    items = parseItemsFromPlayerString(playerStr);
  } else if (player && typeof player === "object") {
    items = parseItemsFromPlayerObject(player);
  }

  const chests = parseChests(player);
  return { items, chests, saveMtime };
}

export interface PriceLookup {
  (marketHashName: string): InventoryPriceInfo | undefined;
}

export function resolveInventory(
  snapshot: InventorySnapshot,
  lookup: (itemKey: number) => GameItem | undefined,
  gameDataLoaded: boolean,
  priceLookup?: PriceLookup,
  steamNames = steamMarketNames(),
): ResolvedInventory {
  const byKey = new Map<number, ResolvedInventoryRow>();

  for (const inst of snapshot.items) {
    let row = byKey.get(inst.itemKey);
    if (!row) {
      const g = lookup(inst.itemKey);
      const match = g ? marketHashMatch(g, steamNames) : null;
      const hash = match?.name ?? null;
      const price = hash && priceLookup ? priceLookup(hash) : undefined;
      row = {
        itemKey: inst.itemKey,
        name: g?.name ?? `Unknown #${inst.itemKey}`,
        grade: g?.grade ?? "UNKNOWN",
        type: g?.type ?? "UNKNOWN",
        marketTradable: g?.marketTradable ?? false,
        marketHashName: hash,
        count: 0,
        inUseCount: 0,
        inventoryCount: 0,
        stashCount: 0,
        tradingCount: 0,
        chaoticCount: 0,
        known: Boolean(g),
        priceRaw: price?.raw ?? null,
        priceLowest: price?.lowest ?? null,
        value: null,
        priceEstimate: match?.estimate ?? false,
      };
      byKey.set(inst.itemKey, row);
    }
    row.count++;
    if (inst.inUse) row.inUseCount++;
    if (inst.isChaotic) row.chaoticCount++;
    if (inst.location === "inventory") row.inventoryCount++;
    else if (inst.location === "stash") row.stashCount++;
    else if (inst.location === "trading") row.tradingCount++;
  }

  const rows = [...byKey.values()];
  let valuedTotal = 0;
  let priceableCount = 0;
  let inUseCount = 0;

  for (const r of rows) {
    inUseCount += r.inUseCount;
    if (r.marketHashName) {
      priceableCount += r.count;
      if (r.priceLowest !== null) {
        r.value = r.priceLowest * r.count;
        valuedTotal += r.value;
      }
    } else {
      r.priceRaw = null;
      r.priceLowest = null;
      r.value = null;
      r.priceEstimate = false;
    }
  }

  const composition: InventoryComposition = {
    total: 0,
    byGrade: {},
    byType: {},
    tradableCount: 0,
    unknownCount: 0,
    chaoticCount: 0,
    inUseCount,
    priceableCount,
    valuedTotal,
    currency: null,
  };
  for (const r of rows) {
    composition.total += r.count;
    composition.byGrade[r.grade] = (composition.byGrade[r.grade] ?? 0) + r.count;
    composition.byType[r.type] = (composition.byType[r.type] ?? 0) + r.count;
    if (r.marketTradable) composition.tradableCount += r.count;
    if (!r.known) composition.unknownCount += r.count;
    composition.chaoticCount += r.chaoticCount;
  }

  return {
    rows,
    composition,
    chests: snapshot.chests,
    saveMtime: snapshot.saveMtime,
    gameDataLoaded,
    currency: null,
  };
}

function parseChests(player: Record<string, unknown> | undefined): ChestHolding[] {
  const chests: ChestHolding[] = [];
  if (!player) return chests;
  const box = player.BoxData as Record<string, unknown> | undefined;
  if (!box || typeof box !== "object") return chests;
  const types = Array.isArray(box.BoxTypes) ? (box.BoxTypes as unknown[]) : [];
  const quantities = Array.isArray(box.BoxQuantity) ? (box.BoxQuantity as unknown[]) : [];
  for (let i = 0; i < types.length; i++) {
    const quantity = Math.trunc(toNum(quantities[i], 0));
    if (quantity <= 0) continue;
    chests.push({ type: Math.trunc(toNum(types[i], 0)), quantity });
  }
  return chests;
}

export function ownedMarketNames(
  snapshot: InventorySnapshot,
  lookup: (itemKey: number) => GameItem | undefined,
  steamNames = steamMarketNames(),
): string[] {
  const names = new Set<string>();
  const seen = new Set<number>();
  for (const inst of snapshot.items) {
    if (seen.has(inst.itemKey)) continue;
    seen.add(inst.itemKey);
    const g = lookup(inst.itemKey);
    if (!g) continue;
    const hash = marketHashMatch(g, steamNames)?.name;
    if (hash) names.add(hash);
  }
  return [...names];
}
