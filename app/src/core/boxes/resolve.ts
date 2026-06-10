import type {
  ChestHolding,
  BoxSlotStatus,
  ChestCapacityBreakdown,
  ResolvedChestRow,
  ChestState,
} from "../../../shared/types";
import type { BoxCategory, BoxTypeCatalog, ChestCapDefinition, RuneBoxCapCatalog } from "./catalog";
import { boxTypeIndex } from "./catalog";
import { purchasedCapRuneNodes, runeCapacityBonus, type RunePurchase } from "./runes";
import {
  actBossBoxCapacity,
  boxSlotState,
  commonBoxCapacity,
  stageBossBoxCapacity,
} from "./capacity";

export {
  boxCapacity,
  commonBoxCapacity,
  stageBossBoxCapacity,
  actBossBoxCapacity,
  boxSlotState,
  commonBoxState,
} from "./capacity";

function aggregateHoldings(chests: ChestHolding[]): Map<number, number> {
  const byType = new Map<number, number>();
  for (const { type, quantity } of chests) {
    byType.set(type, (byType.get(type) ?? 0) + quantity);
  }
  return byType;
}

export function resolveChestHoldings(
  chests: ChestHolding[],
  catalog: BoxTypeCatalog,
): ResolvedChestRow[] {
  const index = boxTypeIndex(catalog);
  const byType = aggregateHoldings(chests.filter((c) => c.quantity > 0));
  const rows: ResolvedChestRow[] = [];

  for (const [boxType, quantity] of byType) {
    const meta = index.get(boxType);
    rows.push({
      boxType,
      label: meta?.label ?? `Type ${boxType}`,
      category: meta?.category ?? "unknown",
      quantity,
    });
  }

  rows.sort((a, b) => {
    const order = (c: string) => (c === "common" ? 0 : c === "rare" ? 1 : c === "act" ? 2 : 3);
    const d = order(a.category) - order(b.category);
    return d !== 0 ? d : a.boxType - b.boxType;
  });
  return rows;
}

function quantityForCategory(rows: ResolvedChestRow[], category: BoxCategory): number {
  return rows.filter((r) => r.category === category).reduce((s, r) => s + r.quantity, 0);
}

function buildCapacityBreakdown(
  purchases: RunePurchase[],
  def: ChestCapDefinition,
): ChestCapacityBreakdown {
  const capRunes = purchasedCapRuneNodes(purchases, def);
  return {
    base: def.baseCapacity,
    runeBonus: runeCapacityBonus(purchases, def),
    purchasedCapRuneNodes: capRunes.length,
    runeLabel: def.runeLabel,
  };
}

function buildCategoryState(
  rows: ResolvedChestRow[],
  category: BoxCategory,
  capacityTotal: number,
): BoxSlotStatus {
  return boxSlotState(quantityForCategory(rows, category), capacityTotal);
}

export function buildChestState(
  chests: ChestHolding[],
  purchases: RunePurchase[],
  saveMtime: number,
  boxTypeCatalog: BoxTypeCatalog,
  runeCapCatalog: RuneBoxCapCatalog,
): ChestState {
  const rows = resolveChestHoldings(chests, boxTypeCatalog);

  const commonCapTotal = commonBoxCapacity(purchases, runeCapCatalog);
  const stageCapTotal = stageBossBoxCapacity(purchases, runeCapCatalog);
  const actCapTotal = actBossBoxCapacity(purchases, runeCapCatalog);

  const common = buildCategoryState(rows, "common", commonCapTotal);
  const stageBoss = buildCategoryState(rows, "rare", stageCapTotal);
  const actBoss = buildCategoryState(rows, "act", actCapTotal);

  const capacity = {
    common: buildCapacityBreakdown(purchases, runeCapCatalog.common),
    stageBoss: buildCapacityBreakdown(purchases, runeCapCatalog.stageBoss),
    actBoss: buildCapacityBreakdown(purchases, runeCapCatalog.actBoss),
    totalRunePurchases: purchases.length,
  };

  return {
    rows,
    common,
    stageBoss,
    actBoss,
    capacity,
    totalHeld: rows.reduce((s, r) => s + r.quantity, 0),
    saveMtime,
    runeBonusSlots: capacity.common.runeBonus,
  };
}

export function commonQuantityFromRows(rows: ResolvedChestRow[]): number {
  return quantityForCategory(rows, "common");
}

export type { BoxSlotStatus };
