import { unwrapEs3Entry } from "../save/snapshot";

export interface RunePurchase {
  runeKey: number;
  level: number;
}

function toNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function parseRuneSaveData(decryptedText: string): RunePurchase[] {
  const root = JSON.parse(decryptedText) as Record<string, unknown>;
  const player = unwrapEs3Entry(root?.PlayerSaveData) as Record<string, unknown> | undefined;
  if (!player || typeof player !== "object") return [];

  const arr = player.RuneSaveData;
  if (!Array.isArray(arr)) return [];

  const out: RunePurchase[] = [];
  for (const raw of arr) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const level = Math.trunc(toNum(row.Level, 0));
    if (level <= 0) continue;
    out.push({
      runeKey: Math.trunc(toNum(row.RuneKey, 0)),
      level,
    });
  }
  return out;
}

export function purchasedRuneIds(purchases: RunePurchase[]): Set<number> {
  return new Set(purchases.map((p) => p.runeKey));
}

export function runeCapacityBonus(
  purchases: RunePurchase[],
  capCatalog: { bonusPerLevel: number; runeKeys: number[] },
): number {
  const capSet = new Set(capCatalog.runeKeys);
  let bonus = 0;
  for (const p of purchases) {
    if (!capSet.has(p.runeKey)) continue;
    bonus += p.level * capCatalog.bonusPerLevel;
  }
  return bonus;
}

/** Purchased chest-cap rune nodes (level > 0) that contribute to a chest slot bonus. */
export function purchasedCapRuneNodes(
  purchases: RunePurchase[],
  capCatalog: { runeKeys: number[] },
): RunePurchase[] {
  const capSet = new Set(capCatalog.runeKeys);
  return purchases.filter((p) => p.level > 0 && capSet.has(p.runeKey));
}
