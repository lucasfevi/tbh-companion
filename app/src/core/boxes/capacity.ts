import type { BoxSlotStatus } from "../../../shared/types";
import type { ChestCapDefinition, RuneBoxCapCatalog } from "./catalog";
import type { RunePurchase } from "./runes";
import { runeCapacityBonus } from "./runes";

export function boxCapacity(purchases: RunePurchase[], def: ChestCapDefinition): number {
  const bonus = runeCapacityBonus(purchases, def);
  return def.baseCapacity + bonus;
}

export function commonBoxCapacity(purchases: RunePurchase[], catalog: RuneBoxCapCatalog): number {
  return boxCapacity(purchases, catalog.common);
}

export function stageBossBoxCapacity(purchases: RunePurchase[], catalog: RuneBoxCapCatalog): number {
  return boxCapacity(purchases, catalog.stageBoss);
}

export function actBossBoxCapacity(purchases: RunePurchase[], catalog: RuneBoxCapCatalog): number {
  return boxCapacity(purchases, catalog.actBoss);
}

export function boxSlotState(heldQty: number, capacity: number): BoxSlotStatus {
  const quantity = Math.max(0, heldQty);
  const cap = Math.max(1, capacity);
  const isFull = quantity >= cap;
  return {
    quantity,
    capacity: cap,
    isFull,
    slotsRemaining: Math.max(0, cap - quantity),
  };
}

/** @deprecated use boxSlotState */
export const commonBoxState = boxSlotState;
