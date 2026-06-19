// Composition aggregation — pure, no node:fs/bundled-data imports, safe to call from the renderer
// to re-aggregate totals over a filtered row subset (rows are already priced by resolveInventory).

import { instantSellValue } from "./buyOrder";
import { aggregateSellerProceeds, type SteamMarketFeeRates } from "../steamMarketFee";
import type { InventoryComposition, ResolvedInventoryRow } from "../../../shared/types";

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
  row.buyOrderLevels = null;
  row.buyOrderValue = null;
  row.buyOrderCoveredCount = null;
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

  if (row.buyOrderLevels?.length) {
    const result = instantSellValue(row.count, row.buyOrderLevels);
    row.buyOrderValue = result.value;
    row.buyOrderCoveredCount = result.coveredCount;
    if (row.buyOrderValue != null) {
      composition.buyOrderValuedTotal += row.buyOrderValue;
      composition.buyOrderPricedRows += 1;
    }
  }
}

/** Aggregate composition totals for an arbitrary row subset (e.g. filtered rows). */
export function computeInventoryComposition(
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
