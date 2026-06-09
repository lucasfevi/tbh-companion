// Map catalog items to Steam Community Market `market_hash_name`s.
//
// Materials: 1:1 on display name. Gear: "<name> (<Grade>) A" (variant letter).
// Gear is only priced at Legendary+; materials are priced regardless of grade.
// When the catalog grade has no Steam listing, pick the nearest market grade.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { GameItem } from "./gamedata";
import { gradeRank, gradeTitle, isPriceableGrade, MIN_PRICEABLE_GEAR_RANK } from "./grades";

const VARIANT_LETTERS = ["A", "B", "C", "D", "E"];

export interface MarketHashMatch {
  name: string;
  /** True when gear grade was inferred from Steam (catalog grade had no listing). */
  estimate: boolean;
}

let steamNamesCache: Set<string> | null = null;

function readSteamNames(path: string): Set<string> | null {
  try {
    const raw = readFileSync(path, "utf-8").replace(/^\uFEFF/, "");
    const j = JSON.parse(raw) as { items: { market_hash_name: string }[] };
    return new Set(j.items.map((i) => i.market_hash_name));
  } catch {
    return null;
  }
}

export function steamMarketNames(resourcesPath = ""): Set<string> {
  if (steamNamesCache) return steamNamesCache;
  const candidates = [
    join(resourcesPath, "data", "steam_market_catalog.json"),
    join(process.cwd(), "..", "data", "steam_market_catalog.json"),
    join(process.cwd(), "data", "steam_market_catalog.json"),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    const set = readSteamNames(p);
    if (set) {
      steamNamesCache = set;
      return set;
    }
  }
  steamNamesCache = new Set();
  return steamNamesCache;
}

export function resetSteamMarketNamesCache(): void {
  steamNamesCache = null;
}

export function isPriceableItem(type: string, grade: string, marketTradable: boolean): boolean {
  if (!marketTradable) return false;
  if (type === "MATERIAL") return true;
  if (type === "GEAR") return isPriceableGrade(grade);
  return false;
}

function gearHashCandidates(itemName: string, steamNames: Set<string>): string[] {
  const prefix = `${itemName} (`;
  return [...steamNames].filter((n) => {
    if (!n.startsWith(prefix)) return false;
    return VARIANT_LETTERS.some((l) => n.endsWith(` ${l}`));
  });
}

function gradeFromMarketHash(hash: string): string | null {
  const m = hash.match(/\(([^)]+)\)\s*[A-E]$/);
  if (!m) return null;
  return m[1].toUpperCase().replace(/\s+/g, "_");
}

function pickNearestGearHash(itemName: string, catalogGrade: string, steamNames: Set<string>): string | null {
  const candidates = gearHashCandidates(itemName, steamNames);
  if (candidates.length === 0) return null;
  const target = gradeRank(catalogGrade);
  let best: string | null = null;
  let bestDist = Infinity;
  for (const c of candidates) {
    const g = gradeFromMarketHash(c);
    if (!g) continue;
    const rank = gradeRank(g);
    if (rank < MIN_PRICEABLE_GEAR_RANK) continue;
    const dist = Math.abs(rank - target);
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }
  return best;
}

function exactGearHash(itemName: string, catalogGrade: string, steamNames: Set<string>): string | null {
  const gt = gradeTitle(catalogGrade);
  for (const letter of VARIANT_LETTERS) {
    const cand = `${itemName} (${gt}) ${letter}`;
    if (steamNames.has(cand)) return cand;
  }
  const plain = `${itemName} (${gt})`;
  return steamNames.has(plain) ? plain : null;
}

/** Resolve a catalog item to a Steam market_hash_name, or null if not priceable/mapped. */
export function marketHashMatch(item: GameItem, steamNames: Set<string>): MarketHashMatch | null {
  if (!isPriceableItem(item.type, item.grade, item.marketTradable)) return null;

  if (item.type === "MATERIAL") {
    return steamNames.has(item.name) ? { name: item.name, estimate: false } : null;
  }

  if (item.type === "GEAR") {
    const exact = exactGearHash(item.name, item.grade, steamNames);
    if (exact) return { name: exact, estimate: false };
    const near = pickNearestGearHash(item.name, item.grade, steamNames);
    return near ? { name: near, estimate: true } : null;
  }

  return null;
}

export function marketHashName(item: GameItem, steamNames: Set<string>): string | null {
  return marketHashMatch(item, steamNames)?.name ?? null;
}
