import type { GameItem } from "../gamedata";
import { marketHashCandidates } from "../marketName";
import { pickMarketUnit } from "../steamPrice";
import type {
  InventorySnapshot,
  InventoryItemInstance,
  ResolvedInventory,
  ResolvedInventoryRow,
  InventoryComposition,
  InventoryPriceInfo,
} from "../../../shared/types";

export interface PriceLookup {
  (marketHashName: string): InventoryPriceInfo | undefined;
}

export interface ResolveInventoryOptions {
  /** Omit rows from the inventory table and composition (e.g. stage boxes). */
  excludeItemKey?: (itemKey: number) => boolean;
}

const EMPTY_UNIT = { unit: null, raw: null, source: null } as const;

type MarketUnit = ReturnType<typeof pickMarketUnit>;

interface MarketResolution {
  hash: string | null;
  unit: MarketUnit;
  priceChecked: boolean;
}

function resolveMarketHashAndPrice(item: GameItem, priceLookup?: PriceLookup): MarketResolution {
  const candidates = marketHashCandidates(item);
  if (candidates.length === 0) {
    return { hash: null, unit: EMPTY_UNIT, priceChecked: false };
  }

  let priceChecked = false;
  let firstUnit: MarketUnit = EMPTY_UNIT;

  for (const hash of candidates) {
    const price = priceLookup?.(hash);
    if (price === undefined) continue;
    priceChecked = true;
    const unit = pickMarketUnit(price);
    if (hash === candidates[0]) firstUnit = unit;
    if (unit.unit != null) return { hash, unit, priceChecked };
  }

  return { hash: candidates[0], unit: firstUnit, priceChecked };
}

function createResolvedRow(
  itemKey: number,
  g: GameItem | undefined,
  market: MarketResolution,
): ResolvedInventoryRow {
  return {
    itemKey,
    name: g?.name ?? `Unknown #${itemKey}`,
    grade: g?.grade ?? "UNKNOWN",
    type: g?.type ?? "UNKNOWN",
    level: g?.level ?? null,
    marketTradable: g?.marketTradable ?? false,
    marketHashName: market.hash,
    count: 0,
    inUseCount: 0,
    inventoryCount: 0,
    stashCount: 0,
    tradingCount: 0,
    chaoticCount: 0,
    known: Boolean(g),
    priceRaw: market.unit.raw,
    unitPrice: market.unit.unit,
    priceSource: market.unit.source,
    priceChecked: market.priceChecked,
    value: null,
  };
}

function applyInstance(row: ResolvedInventoryRow, inst: InventoryItemInstance): void {
  row.count++;
  if (inst.inUse) row.inUseCount++;
  if (inst.isChaotic) row.chaoticCount++;
  if (inst.location === "inventory") row.inventoryCount++;
  else if (inst.location === "stash") row.stashCount++;
  else if (inst.location === "trading") row.tradingCount++;
}

function finalizeRows(rows: ResolvedInventoryRow[]): InventoryComposition {
  const composition: InventoryComposition = {
    total: 0,
    byGrade: {},
    byType: {},
    tradableCount: 0,
    unknownCount: 0,
    chaoticCount: 0,
    inUseCount: 0,
    priceableCount: 0,
    valuedTotal: 0,
    currency: null,
  };

  for (const row of rows) {
    composition.inUseCount += row.inUseCount;
    composition.total += row.count;
    composition.byGrade[row.grade] = (composition.byGrade[row.grade] ?? 0) + row.count;
    composition.byType[row.type] = (composition.byType[row.type] ?? 0) + row.count;
    if (row.marketTradable) composition.tradableCount += row.count;
    if (!row.known) composition.unknownCount += row.count;
    composition.chaoticCount += row.chaoticCount;

    if (!row.marketHashName) {
      row.priceRaw = null;
      row.unitPrice = null;
      row.priceSource = null;
      row.priceChecked = false;
      row.value = null;
      continue;
    }

    composition.priceableCount += row.count;
    if (row.unitPrice !== null) {
      row.value = row.unitPrice * row.count;
      composition.valuedTotal += row.value;
    }
  }

  return composition;
}

export function resolveInventory(
  snapshot: InventorySnapshot,
  lookup: (itemKey: number) => GameItem | undefined,
  gameDataLoaded: boolean,
  priceLookup?: PriceLookup,
  options?: ResolveInventoryOptions,
): ResolvedInventory {
  const exclude = options?.excludeItemKey;
  const byKey = new Map<number, ResolvedInventoryRow>();

  for (const inst of snapshot.items) {
    if (exclude?.(inst.itemKey)) continue;
    let row = byKey.get(inst.itemKey);
    if (!row) {
      const g = lookup(inst.itemKey);
      const market = g ? resolveMarketHashAndPrice(g, priceLookup) : null;
      row = createResolvedRow(
        inst.itemKey,
        g,
        market ?? { hash: null, unit: EMPTY_UNIT, priceChecked: false },
      );
      byKey.set(inst.itemKey, row);
    }
    applyInstance(row, inst);
  }

  // Material stacks from aggregateSaveDatas (when mapped) can exceed instance rows.
  if (snapshot.materialStacks) {
    for (const [itemKey, stackQty] of snapshot.materialStacks) {
      if (exclude?.(itemKey)) continue;
      let row = byKey.get(itemKey);
      const g = lookup(itemKey);
      if (!row && g) {
        row = createResolvedRow(itemKey, g, resolveMarketHashAndPrice(g, priceLookup));
        byKey.set(itemKey, row);
      }
      if (row?.type === "MATERIAL" && stackQty > row.count) {
        row.count = stackQty;
        row.inventoryCount = stackQty;
      }
    }
  }

  const rows = [...byKey.values()];
  const composition = finalizeRows(rows);

  return {
    rows,
    composition,
    chests: snapshot.chests,
    saveMtime: snapshot.saveMtime,
    gameDataLoaded,
    currency: null,
  };
}

export function ownedMarketNames(
  snapshot: InventorySnapshot,
  lookup: (itemKey: number) => GameItem | undefined,
  excludeItemKey?: (itemKey: number) => boolean,
): string[] {
  const names = new Set<string>();
  const seen = new Set<number>();
  for (const inst of snapshot.items) {
    if (excludeItemKey?.(inst.itemKey)) continue;
    if (seen.has(inst.itemKey)) continue;
    seen.add(inst.itemKey);
    const g = lookup(inst.itemKey);
    if (!g) continue;
    for (const hash of marketHashCandidates(g)) names.add(hash);
  }
  return [...names];
}
