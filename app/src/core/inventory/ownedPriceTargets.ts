// Owned items to refresh on Steam Market — one logical target per catalog piece.

import type { GameItem } from "../gamedata";
import { marketHashCandidates, limitGearVariantHashes } from "../marketName";
import type { InventorySnapshot } from "../../../shared/types";

export type OwnedPriceTarget =
  | { kind: "material"; hash: string }
  | { kind: "gear"; candidates: readonly string[] };

/** All market_hash_name keys that may appear in the price cache for owned items. */
export function flattenOwnedHashes(targets: readonly OwnedPriceTarget[]): string[] {
  const names = new Set<string>();
  for (const target of targets) {
    if (target.kind === "material") {
      names.add(target.hash);
    } else {
      target.candidates.forEach((hash) => names.add(hash));
    }
  }
  return [...names];
}

export function ownedPriceTargetForItem(item: GameItem): OwnedPriceTarget | null {
  const candidates = marketHashCandidates(item);
  if (candidates.length === 0) return null;
  if (item.type === "MATERIAL") return { kind: "material", hash: candidates[0] };
  return { kind: "gear", candidates: limitGearVariantHashes(candidates) };
}

export function ownedPriceTargets(
  snapshot: InventorySnapshot,
  lookup: (itemKey: number) => GameItem | undefined,
  excludeItemKey?: (itemKey: number) => boolean,
): OwnedPriceTarget[] {
  const targets: OwnedPriceTarget[] = [];
  const seenItemKeys = new Set<number>();

  snapshot.items.forEach((instance) => {
    if (excludeItemKey?.(instance.itemKey)) return;
    if (seenItemKeys.has(instance.itemKey)) return;
    seenItemKeys.add(instance.itemKey);

    const catalogItem = lookup(instance.itemKey);
    if (!catalogItem) return;

    const target = ownedPriceTargetForItem(catalogItem);
    if (target) targets.push(target);
  });

  return targets;
}
