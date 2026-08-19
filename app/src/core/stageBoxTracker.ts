import { readBundledJson } from "./bundledData";
import { stageName } from "./stages";
import type { GameItem } from "./gamedata";

export interface StageBoxTrackerMeta {
  canonical: true;
  idealStageKey: number;
  dropStageKeys: number[];
  dropStageRangeLabel: string;
}

export interface StageBoxCatalogItem extends GameItem {
  obtainable: boolean;
  tracker?: StageBoxTrackerMeta;
}

export interface StageBoxCatalogFile {
  source: string;
  fetchedUtc?: string;
  defaultCooldownSeconds: number;
  count: number;
  items: StageBoxCatalogItem[];
}

export interface StageBoxTrackerRoute {
  boxId: number;
  level: number;
  idealStageKey: number;
  idealStageLabel: string;
  dropStageKeys: number[];
  dropStageRangeLabel: string;
}

export function loadStageBoxCatalogFile(): StageBoxCatalogFile {
  return readBundledJson<StageBoxCatalogFile>("stage_boxes.json");
}

export function loadStageBoxTrackerRoutes(
  catalog: StageBoxCatalogFile = loadStageBoxCatalogFile(),
): StageBoxTrackerRoute[] {
  return catalog.items
    .filter(
      (item): item is StageBoxCatalogItem & { tracker: StageBoxTrackerMeta } =>
        item.grade === "RARE" && item.obtainable && item.tracker?.canonical === true,
    )
    .map((item) => ({
      boxId: item.id,
      level: item.level ?? 0,
      idealStageKey: item.tracker.idealStageKey,
      idealStageLabel: stageName(item.tracker.idealStageKey),
      dropStageKeys: item.tracker.dropStageKeys,
      dropStageRangeLabel: item.tracker.dropStageRangeLabel,
    }))
    .sort((a, b) => a.level - b.level || a.boxId - b.boxId);
}

export function trackerRoutesById(
  routes: StageBoxTrackerRoute[],
): Map<number, StageBoxTrackerRoute> {
  return new Map(routes.map((route) => [route.boxId, route]));
}

/** Map any obtainable rare stage-box ItemKey to its canonical tracker box id. */
export function canonicalTrackerBoxId(
  itemKey: number,
  catalog: StageBoxCatalogFile = loadStageBoxCatalogFile(),
): number | null {
  const item = catalog.items.find((entry) => entry.id === itemKey);
  if (!item || item.grade !== "RARE" || !item.obtainable) return null;
  if (item.tracker?.canonical) return item.id;
  if (item.level == null) return null;
  const canonical = catalog.items.find(
    (entry) =>
      entry.tracker?.canonical === true &&
      entry.grade === "RARE" &&
      entry.obtainable &&
      entry.level === item.level,
  );
  return canonical?.id ?? null;
}

/** Resolve a Player.log ItemKey to a box id when that level is tracked and enabled. */
export function resolveTrackedDropBoxId(
  itemKey: number,
  enabledBoxIds: ReadonlySet<number>,
  isTrackedRoute: (boxId: number) => boolean,
  catalog: StageBoxCatalogFile = loadStageBoxCatalogFile(),
): number | null {
  const boxId = canonicalTrackerBoxId(itemKey, catalog);
  if (boxId == null || !isTrackedRoute(boxId) || !enabledBoxIds.has(boxId)) return null;
  return boxId;
}
