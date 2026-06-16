import type { GameItem } from "../gamedata";
import { marketHashName } from "../marketName";
import { flattenOwnedHashes, ownedPriceTargets } from "./ownedPriceTargets";
import { pickMarketUnit } from "../steamPrice";
import {
  aggregateSellerProceeds,
  getTbhMarketFeeRates,
  type SteamMarketFeeRates,
} from "../steamMarketFee";
import { instantSellValue } from "./buyOrder";
import type {
  InventorySnapshot,
  InventoryItemInstance,
  ItemLocation,
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
  /** Steam market fee rates for net-after-fees totals. Defaults to TBH bundled rates. */
  marketFeeRates?: SteamMarketFeeRates;
}

const EMPTY_UNIT = { unit: null, raw: null, source: null } as const;

type MarketUnit = ReturnType<typeof pickMarketUnit>;

interface MarketResolution {
  hash: string | null;
  unit: MarketUnit;
  rawMedian: string | null;
  rawLowest: string | null;
  priceChecked: boolean;
  buyOrderUnit: number | null;
  buyOrderRaw: string | null;
  buyOrderQuantity: number | null;
  buyOrderChecked: boolean;
}

const NO_MARKET: MarketResolution = {
  hash: null,
  unit: EMPTY_UNIT,
  rawMedian: null,
  rawLowest: null,
  priceChecked: false,
  buyOrderUnit: null,
  buyOrderRaw: null,
  buyOrderQuantity: null,
  buyOrderChecked: false,
};

function sellRawFromPrice(price: InventoryPriceInfo): {
  rawMedian: string | null;
  rawLowest: string | null;
} {
  return {
    rawMedian: price.rawMedian ?? null,
    rawLowest: price.rawLowest ?? null,
  };
}

function emptyComposition(): InventoryComposition {
  return {
    total: 0,
    byGrade: {},
    byType: {},
    tradableCount: 0,
    unknownCount: 0,
    chaoticCount: 0,
    inUseCount: 0,
    priceableCount: 0,
    valuedTotal: 0,
    feeTotal: 0,
    netAfterFeesTotal: 0,
    buyOrderValuedTotal: 0,
    buyOrderPricedRows: 0,
    currency: null,
  };
}

function buyOrderFromPrice(price: InventoryPriceInfo): {
  unit: number | null;
  raw: string | null;
  quantity: number | null;
  checked: boolean;
} {
  return {
    unit: price.buyOrder ?? null,
    raw: price.rawBuyOrder ?? null,
    quantity: price.buyOrderQuantity ?? null,
    checked: price.buyOrderFetched === true,
  };
}

function resolveMarketHashAndPrice(
  catalogItem: GameItem,
  priceLookup?: PriceLookup,
): MarketResolution {
  const hash = marketHashName(catalogItem);
  if (!hash) return NO_MARKET;

  const price = priceLookup?.(hash);
  if (!price) {
    return {
      hash,
      unit: EMPTY_UNIT,
      rawMedian: null,
      rawLowest: null,
      priceChecked: false,
      buyOrderUnit: null,
      buyOrderRaw: null,
      buyOrderQuantity: null,
      buyOrderChecked: false,
    };
  }

  const unit = pickMarketUnit(price);
  const buy = buyOrderFromPrice(price);
  const sellRaw = sellRawFromPrice(price);
  return {
    hash,
    unit,
    rawMedian: sellRaw.rawMedian,
    rawLowest: sellRaw.rawLowest,
    priceChecked: true,
    buyOrderUnit: buy.unit,
    buyOrderRaw: buy.raw,
    buyOrderQuantity: buy.quantity,
    buyOrderChecked: buy.checked,
  };
}

function createResolvedRow(
  itemKey: number,
  catalogItem: GameItem | undefined,
  market: MarketResolution,
): ResolvedInventoryRow {
  return {
    itemKey,
    name: catalogItem?.name ?? `Unknown #${itemKey}`,
    grade: catalogItem?.grade ?? "UNKNOWN",
    type: catalogItem?.type ?? "UNKNOWN",
    level: catalogItem?.level ?? null,
    marketTradable: catalogItem?.marketTradable ?? false,
    marketHashName: market.hash,
    count: 0,
    inUseCount: 0,
    inventoryCount: 0,
    stashCount: 0,
    tradingCount: 0,
    chaoticCount: 0,
    known: Boolean(catalogItem),
    priceRaw: market.unit.raw,
    rawMedian: market.rawMedian,
    rawLowest: market.rawLowest,
    unitPrice: market.unit.unit,
    priceSource: market.unit.source,
    priceChecked: market.priceChecked,
    value: null,
    buyOrderRaw: market.buyOrderRaw,
    buyOrderUnit: market.buyOrderUnit,
    buyOrderQuantity: market.buyOrderQuantity,
    buyOrderValue: null,
    buyOrderChecked: market.buyOrderChecked,
  };
}

function locationCountKey(
  location: ItemLocation,
): "inventoryCount" | "stashCount" | "tradingCount" | null {
  if (location === "inventory") return "inventoryCount";
  if (location === "stash") return "stashCount";
  if (location === "trading") return "tradingCount";
  return null;
}

function applyInstance(row: ResolvedInventoryRow, instance: InventoryItemInstance): void {
  row.count++;
  if (instance.inUse) row.inUseCount++;
  if (instance.isChaotic) row.chaoticCount++;
  const countKey = locationCountKey(instance.location);
  if (countKey) row[countKey]++;
}

function clearRowPricing(row: ResolvedInventoryRow): void {
  row.priceRaw = null;
  row.rawMedian = null;
  row.rawLowest = null;
  row.unitPrice = null;
  row.priceSource = null;
  row.priceChecked = false;
  row.value = null;
  row.buyOrderRaw = null;
  row.buyOrderUnit = null;
  row.buyOrderQuantity = null;
  row.buyOrderValue = null;
  row.buyOrderChecked = false;
}

function accumulateCompositionRow(
  composition: InventoryComposition,
  row: ResolvedInventoryRow,
): void {
  composition.inUseCount += row.inUseCount;
  composition.total += row.count;
  composition.byGrade[row.grade] = (composition.byGrade[row.grade] ?? 0) + row.count;
  composition.byType[row.type] = (composition.byType[row.type] ?? 0) + row.count;
  if (row.marketTradable) composition.tradableCount += row.count;
  if (!row.known) composition.unknownCount += row.count;
  composition.chaoticCount += row.chaoticCount;

  if (!row.marketHashName) {
    clearRowPricing(row);
    return;
  }

  composition.priceableCount += row.count;

  if (row.unitPrice != null) {
    row.value = row.unitPrice * row.count;
    composition.valuedTotal += row.value;
  }

  if (row.buyOrderUnit != null) {
    row.buyOrderValue = instantSellValue(row.buyOrderUnit, row.count, row.buyOrderQuantity);
    if (row.buyOrderValue != null) {
      composition.buyOrderValuedTotal += row.buyOrderValue;
      composition.buyOrderPricedRows += 1;
    }
  }
}

function finalizeRows(
  rows: ResolvedInventoryRow[],
  feeRates: SteamMarketFeeRates,
): InventoryComposition {
  const composition = emptyComposition();
  rows.forEach((row) => accumulateCompositionRow(composition, row));

  const feeLines = rows
    .filter((row) => row.unitPrice != null && row.count > 0)
    .map((row) => ({ buyerUnitPrice: row.unitPrice!, count: row.count }));

  const proceeds = aggregateSellerProceeds(feeLines, feeRates);
  composition.feeTotal = proceeds.feeTotal;
  composition.netAfterFeesTotal = proceeds.netTotal;

  return composition;
}

function ensureRow(
  rowsByItemKey: Map<number, ResolvedInventoryRow>,
  itemKey: number,
  catalogItem: GameItem | undefined,
  priceLookup?: PriceLookup,
): ResolvedInventoryRow {
  const existing = rowsByItemKey.get(itemKey);
  if (existing) return existing;

  const market = catalogItem ? resolveMarketHashAndPrice(catalogItem, priceLookup) : NO_MARKET;
  const row = createResolvedRow(itemKey, catalogItem, market);
  rowsByItemKey.set(itemKey, row);
  return row;
}

function accumulateInstances(
  rowsByItemKey: Map<number, ResolvedInventoryRow>,
  items: InventoryItemInstance[],
  lookup: (itemKey: number) => GameItem | undefined,
  priceLookup: PriceLookup | undefined,
  excludeItemKey?: (itemKey: number) => boolean,
): void {
  items.forEach((instance) => {
    if (excludeItemKey?.(instance.itemKey)) return;
    const row = ensureRow(rowsByItemKey, instance.itemKey, lookup(instance.itemKey), priceLookup);
    applyInstance(row, instance);
  });
}

function mergeMaterialStacks(
  rowsByItemKey: Map<number, ResolvedInventoryRow>,
  stacks: Map<number, number>,
  lookup: (itemKey: number) => GameItem | undefined,
  priceLookup: PriceLookup | undefined,
  excludeItemKey?: (itemKey: number) => boolean,
): void {
  stacks.forEach((stackQty, itemKey) => {
    if (excludeItemKey?.(itemKey)) return;

    const catalogItem = lookup(itemKey);
    if (!catalogItem) return;

    const row = rowsByItemKey.has(itemKey)
      ? rowsByItemKey.get(itemKey)!
      : ensureRow(rowsByItemKey, itemKey, catalogItem, priceLookup);
    if (row.type !== "MATERIAL" || stackQty <= row.count) return;

    row.count = stackQty;
    row.inventoryCount = stackQty;
  });
}

export function resolveInventory(
  snapshot: InventorySnapshot,
  lookup: (itemKey: number) => GameItem | undefined,
  gameDataLoaded: boolean,
  priceLookup?: PriceLookup,
  options?: ResolveInventoryOptions,
): ResolvedInventory {
  const excludeItemKey = options?.excludeItemKey;
  const feeRates = options?.marketFeeRates ?? getTbhMarketFeeRates();
  const rowsByItemKey = new Map<number, ResolvedInventoryRow>();

  accumulateInstances(rowsByItemKey, snapshot.items, lookup, priceLookup, excludeItemKey);

  if (snapshot.materialStacks) {
    mergeMaterialStacks(
      rowsByItemKey,
      snapshot.materialStacks,
      lookup,
      priceLookup,
      excludeItemKey,
    );
  }

  const rows = [...rowsByItemKey.values()];
  const composition = finalizeRows(rows, feeRates);

  return {
    rows,
    composition,
    chests: snapshot.chests,
    saveMtime: snapshot.saveMtime,
    gameDataLoaded,
    currency: null,
  };
}

/** Flat market_hash_name list for cache prune (gear variant A only). */
export function ownedMarketNames(
  snapshot: InventorySnapshot,
  lookup: (itemKey: number) => GameItem | undefined,
  excludeItemKey?: (itemKey: number) => boolean,
): string[] {
  return flattenOwnedHashes(ownedPriceTargets(snapshot, lookup, excludeItemKey));
}
