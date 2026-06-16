// Map catalog items to Steam Community Market `market_hash_name`s.
//
// Materials: 1:1 on display name. Gear: "<name> (<Grade>) A" (variant letter).
// Gear is only priced at Legendary+; materials are priced regardless of grade.
// Exact grade only (no cross-grade fallback). priceoverview confirms listings.
//
// Variant B–E are not probed: save letter is unknown and B listings are often phantom.

import type { GameItem } from "./gamedata";
import { gradeTitle, isPriceableGrade } from "./grades";

export interface MarketHashMatch {
  name: string;
}

export function isPriceableItem(type: string, grade: string, marketTradable: boolean): boolean {
  if (!marketTradable) return false;
  if (type === "MATERIAL") return true;
  if (type === "GEAR") return isPriceableGrade(grade);
  return false;
}

/** Gear market hash suffix letters we price and link to (A only until save letter is known). */
export const GEAR_MARKET_VARIANT_LETTERS = ["A"] as const;

const GEAR_VARIANT_SUFFIX_RE = /\) ([A-Z])$/;

/** Keep materials and gear `… A` hashes; drop other variant letters from stale inputs. */
export function limitGearVariantHashes(hashes: readonly string[]): string[] {
  const allowed = new Set<string>(GEAR_MARKET_VARIANT_LETTERS);
  return hashes.filter((hash) => {
    const match = hash.match(GEAR_VARIANT_SUFFIX_RE);
    if (!match) return true;
    return allowed.has(match[1]);
  });
}

export function gearMarketHash(
  itemName: string,
  catalogGrade: string,
  variantLetter: (typeof GEAR_MARKET_VARIANT_LETTERS)[number] = "A",
): string {
  return `${itemName} (${gradeTitle(catalogGrade)}) ${variantLetter}`;
}

/** Steam hash for a priceable gear piece (variant A). */
export function gearMarketHashCandidates(itemName: string, catalogGrade: string): string[] {
  return [gearMarketHash(itemName, catalogGrade, "A")];
}

/** Resolve a catalog item to a Steam market_hash_name, or null if not priceable. */
export function marketHashMatch(item: GameItem): MarketHashMatch | null {
  if (!isPriceableItem(item.type, item.grade, item.marketTradable)) return null;

  if (item.type === "MATERIAL") {
    return { name: item.name };
  }

  if (item.type === "GEAR") {
    return { name: gearMarketHash(item.name, item.grade, "A") };
  }

  return null;
}

/** Steam hash names to price (gear: variant A; materials: display name). */
export function marketHashCandidates(item: GameItem): string[] {
  if (!isPriceableItem(item.type, item.grade, item.marketTradable)) return [];
  if (item.type === "MATERIAL") return [item.name];
  if (item.type === "GEAR") return gearMarketHashCandidates(item.name, item.grade);
  return [];
}

export function marketHashName(item: GameItem): string | null {
  return marketHashMatch(item)?.name ?? null;
}
