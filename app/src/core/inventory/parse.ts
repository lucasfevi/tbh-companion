// Parse owned items and chests from decrypted save JSON.

import { catalogItemKeyFromSave, isMarketPipelineSaveItemKey } from "../gamedata";
import { unwrapEs3Entry } from "../save/snapshot";
import { materialStacksFromAggregates, parseAggregateEntries } from "./aggregates";
import type {
  InventoryItemInstance,
  ChestHolding,
  InventorySnapshot,
  ItemLocation,
} from "../../../shared/types";

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
    for (const id of m[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)) {
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

const SLOT_OBJECT_RE = /\{[^{}]*\}/g;

/** Counts unlocked inventory slots and how many hold an item, from a flat slot-object array.
 *  Assumes each slot entry is a shallow JSON object (no nested braces), matching save layout. */
function parseSlotCapacity(arrText: string): { capacity: number; used: number } {
  let capacity = 0;
  let used = 0;
  for (const m of arrText.matchAll(SLOT_OBJECT_RE)) {
    const obj = m[0];
    const isUnlock = /"IsUnlock"\s*:\s*true/.test(obj);
    if (!isUnlock) continue;
    capacity++;
    const idMatch = /"ItemUniqueId"\s*:\s*(\d+)/.exec(obj);
    if (idMatch && idMatch[1] !== "0") used++;
  }
  return { capacity, used };
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

function parseItemsFromPlayerString(playerStr: string): {
  items: InventoryItemInstance[];
  marketPipelineOnlyCatalogKeys: Set<number>;
} {
  const equipped = parseEquippedIds(playerStr);
  const inventory = parseSlotUniqueIds(playerStr, '"inventorySaveDatas":');
  const stash = parseSlotUniqueIds(playerStr, '"stashSaveDatas":');
  const trading = parseSlotUniqueIds(playerStr, '"tradingStashSaveDatas":');
  const arr = sliceJsonArray(playerStr, '"itemSaveDatas":');
  const items: InventoryItemInstance[] = [];
  const assignableCatalogIds = new Set<number>();
  const pipelineCatalogIds = new Set<number>();
  for (const m of arr.matchAll(ITEM_TRIPLE_RE)) {
    const rawItemKey = Math.trunc(Number(m[1]));
    const catalogId = catalogItemKeyFromSave(rawItemKey);
    if (catalogId <= 0) continue;
    if (isMarketPipelineSaveItemKey(rawItemKey)) {
      pipelineCatalogIds.add(catalogId);
      continue;
    }
    assignableCatalogIds.add(catalogId);
    const uniqueId = m[2];
    const location = resolveLocation(uniqueId, equipped, inventory, stash, trading);
    items.push({
      itemKey: catalogId,
      isChaotic: m[3] === "true",
      inUse: equipped.has(uniqueId),
      location,
    });
  }
  const marketPipelineOnlyCatalogKeys = new Set(
    [...pipelineCatalogIds].filter((id) => !assignableCatalogIds.has(id)),
  );
  return { items, marketPipelineOnlyCatalogKeys };
}

function parseItemsFromPlayerObject(player: Record<string, unknown>): {
  items: InventoryItemInstance[];
  marketPipelineOnlyCatalogKeys: Set<number>;
} {
  const items: InventoryItemInstance[] = [];
  const assignableCatalogIds = new Set<number>();
  const pipelineCatalogIds = new Set<number>();
  const arr = player.itemSaveDatas;
  if (!Array.isArray(arr)) {
    return { items, marketPipelineOnlyCatalogKeys: new Set() };
  }
  for (const raw of arr) {
    if (!raw || typeof raw !== "object") continue;
    const it = raw as Record<string, unknown>;
    const rawItemKey = Math.trunc(toNum(it.ItemKey, 0));
    const catalogId = catalogItemKeyFromSave(rawItemKey);
    if (catalogId <= 0) continue;
    if (isMarketPipelineSaveItemKey(rawItemKey)) {
      pipelineCatalogIds.add(catalogId);
      continue;
    }
    assignableCatalogIds.add(catalogId);
    items.push({
      itemKey: catalogId,
      isChaotic: Boolean(it.IsChaotic),
      inUse: false,
      location: "unknown",
    });
  }
  const marketPipelineOnlyCatalogKeys = new Set(
    [...pipelineCatalogIds].filter((id) => !assignableCatalogIds.has(id)),
  );
  return { items, marketPipelineOnlyCatalogKeys };
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

export function parseInventory(
  decryptedText: string,
  saveMtime = 0,
  isMaterialItemKey?: (itemKey: number) => boolean,
): InventorySnapshot {
  const root = JSON.parse(decryptedText) as Record<string, unknown>;
  const playerEntry = root?.PlayerSaveData as { value?: unknown } | undefined;
  const playerStr = typeof playerEntry?.value === "string" ? playerEntry.value : null;
  const player = unwrapEs3Entry(root?.PlayerSaveData) as Record<string, unknown> | undefined;

  let items: InventoryItemInstance[] = [];
  let marketPipelineOnlyCatalogKeys: Set<number> | undefined;
  if (playerStr) {
    ({ items, marketPipelineOnlyCatalogKeys } = parseItemsFromPlayerString(playerStr));
  } else if (player && typeof player === "object") {
    ({ items, marketPipelineOnlyCatalogKeys } = parseItemsFromPlayerObject(player));
  }

  const chests = parseChests(player);
  let materialStacks: Map<number, number> | undefined;
  if (isMaterialItemKey) {
    materialStacks = materialStacksFromAggregates(parseAggregateEntries(player), isMaterialItemKey);
  }

  let inventoryCapacity = 0;
  let inventoryUsed = 0;
  if (playerStr) {
    const arr = sliceJsonArray(playerStr, '"inventorySaveDatas":');
    ({ capacity: inventoryCapacity, used: inventoryUsed } = parseSlotCapacity(arr));
  } else if (player && Array.isArray(player.inventorySaveDatas)) {
    for (const raw of player.inventorySaveDatas) {
      if (!raw || typeof raw !== "object") continue;
      const row = raw as Record<string, unknown>;
      if (!row.IsUnlock) continue;
      inventoryCapacity++;
      if (toNum(row.ItemUniqueId, 0) !== 0) inventoryUsed++;
    }
  }

  return {
    items,
    chests,
    saveMtime,
    materialStacks,
    inventoryCapacity,
    inventoryUsed,
    marketPipelineOnlyCatalogKeys,
  };
}
