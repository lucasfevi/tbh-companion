// Parse the save's owned items + held chests into a framework-free snapshot.
//
// Owned items come from PlayerSaveData.itemSaveDatas, which is the master list
// of every owned instance (inventory + stash + trading + equipped) - verified:
// all non-empty inventory/stash/trading slot refs resolve into it. We read it
// as an array and never join by UniqueId, which is unsafe in JS (see
// shared/types InventoryItemInstance and docs/SAVE_FORMAT.md).

import { unwrapEs3Entry } from "./saveReader";
import type { GameItem } from "./gamedata";
import type {
  InventoryItemInstance,
  ChestHolding,
  InventorySnapshot,
  ResolvedInventory,
  ResolvedInventoryRow,
  InventoryComposition,
} from "../../shared/types";

function toNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function parseInventory(decryptedText: string, saveMtime = 0): InventorySnapshot {
  const root = JSON.parse(decryptedText) as Record<string, unknown>;
  const player = unwrapEs3Entry(root?.PlayerSaveData) as Record<string, unknown> | undefined;

  const items: InventoryItemInstance[] = [];
  if (player && typeof player === "object") {
    const arr = player.itemSaveDatas;
    if (Array.isArray(arr)) {
      for (const raw of arr) {
        if (!raw || typeof raw !== "object") continue;
        const it = raw as Record<string, unknown>;
        const itemKey = Math.trunc(toNum(it.ItemKey, 0));
        if (itemKey <= 0) continue;
        items.push({ itemKey, isChaotic: Boolean(it.IsChaotic) });
      }
    }
  }

  const chests = parseChests(player);
  return { items, chests, saveMtime };
}

/**
 * Group owned instances by ItemKey and resolve names/grades via the catalog.
 * `lookup` is typically GameDataProvider.get. Pure, so it's unit-testable.
 */
export function resolveInventory(
  snapshot: InventorySnapshot,
  lookup: (itemKey: number) => GameItem | undefined,
  gameDataLoaded: boolean,
): ResolvedInventory {
  const byKey = new Map<number, ResolvedInventoryRow>();

  for (const inst of snapshot.items) {
    let row = byKey.get(inst.itemKey);
    if (!row) {
      const g = lookup(inst.itemKey);
      row = {
        itemKey: inst.itemKey,
        name: g?.name ?? `Unknown #${inst.itemKey}`,
        grade: g?.grade ?? "UNKNOWN",
        type: g?.type ?? "UNKNOWN",
        marketTradable: g?.marketTradable ?? false,
        count: 0,
        chaoticCount: 0,
        known: Boolean(g),
      };
      byKey.set(inst.itemKey, row);
    }
    row.count++;
    if (inst.isChaotic) row.chaoticCount++;
  }

  const rows = [...byKey.values()];
  const composition: InventoryComposition = {
    total: 0,
    byGrade: {},
    byType: {},
    tradableCount: 0,
    unknownCount: 0,
    chaoticCount: 0,
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
  };
}

// BoxData stores held (unopened) chests as three parallel arrays.
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
