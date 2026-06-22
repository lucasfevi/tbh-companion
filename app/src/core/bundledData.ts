import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** JSON shipped via electron-builder extraResources → resources/data/. */
export const REQUIRED_BUNDLED_DATA_FILES = [
  "gamedata.json",
  "stage_boxes.json",
  "box_types.json",
  "rune_box_cap.json",
  "rune_auto_open.json",
  "pets.json",
  "steam_item_nameids.json",
  "steam_market_fee.json",
  "lookup_items.json",
  "lookup_sources.json",
  "synthesis_model.json",
] as const;

export type BundledDataFile = (typeof REQUIRED_BUNDLED_DATA_FILES)[number];

/** Search order: packaged resources, repo dev (app/../data), cwd/data. */
export function bundledDataCandidates(filename: string): string[] {
  const candidates: string[] = [];
  if (process.resourcesPath) {
    candidates.push(join(process.resourcesPath, "data", filename));
  }
  candidates.push(join(process.cwd(), "..", "data", filename));
  candidates.push(join(process.cwd(), "data", filename));
  return candidates;
}

export function resolveBundledDataPath(filename: string): string {
  const candidates = bundledDataCandidates(filename);
  const found = candidates.find((p) => existsSync(p));
  if (found) return found;
  throw new Error(
    `Bundled data file not found: ${filename}\nTried:\n${candidates.map((p) => `  - ${p}`).join("\n")}`,
  );
}

export function readBundledJson<T>(filename: BundledDataFile | string): T {
  const raw = readFileSync(resolveBundledDataPath(filename), "utf-8").replace(/^\uFEFF/, "");
  return JSON.parse(raw) as T;
}
