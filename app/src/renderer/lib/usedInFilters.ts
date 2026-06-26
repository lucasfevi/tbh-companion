import type { LookupItem, LookupUsedInEntry, LookupUsedInOutput } from "../../../shared/types";

export function sortUsedInRecipes(entries: LookupUsedInEntry[]): LookupUsedInEntry[] {
  return [...entries].toSorted((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    return a.craftingType.localeCompare(b.craftingType);
  });
}

export function filterUsedInOutputs(
  outputs: LookupUsedInOutput[],
  query: string,
  itemIndex: Map<number, LookupItem>,
): LookupUsedInOutput[] {
  const q = query.trim().toLowerCase();
  const filtered = outputs.filter((output) => {
    const item = itemIndex.get(output.itemKey);
    if (!item) return q.length === 0;
    if (!q) return true;
    return item.name.toLowerCase().includes(q);
  });
  return filtered.toSorted((a, b) => b.poolPct - a.poolPct);
}
