import type { BoxTimerCatalogEntry } from "../../../shared/types";

export const TRACKER_LEVEL_CHIP_WIDTH_CLASS = "w-[4.5rem]";
export const TRACKER_LEVEL_CHIP_GRID_CLASS = "grid-cols-[repeat(auto-fill,4.5rem)]";

export const TRACKER_PRESETS: { label: string; title: string; levels: number[] }[] = [
  { label: "Starter", title: "Lv 1–7 (Act 1 bosses)", levels: [1, 2, 3, 4, 5, 6, 7] },
  { label: "Mid", title: "Lv 15–30", levels: [15, 20, 30] },
  { label: "Late", title: "Lv 40–80", levels: [40, 50, 65, 80] },
];

export function enabledBoxIds(catalog: BoxTimerCatalogEntry[]): number[] {
  return catalog.filter((entry) => entry.enabled).map((entry) => entry.boxId);
}

export function toggleTrackedLevel(
  entry: BoxTimerCatalogEntry,
  catalog: BoxTimerCatalogEntry[],
): void {
  const current = enabledBoxIds(catalog);
  if (entry.enabled) {
    void window.tbh.setBoxTrackerBoxes(current.filter((id) => id !== entry.boxId));
  } else {
    void window.tbh.setBoxTrackerBoxes([...current, entry.boxId]);
  }
}

export function applyTrackerPreset(levels: number[], catalog: BoxTimerCatalogEntry[]): void {
  const ids = catalog
    .filter((entry) => entry.level != null && levels.includes(entry.level))
    .map((entry) => entry.boxId);
  void window.tbh.setBoxTrackerBoxes(ids);
}

export function trackedLevelsSummary(catalog: BoxTimerCatalogEntry[]): string {
  const levels = catalog.filter((entry) => entry.enabled).map((entry) => entry.level);
  if (levels.length === 0) return "None";
  if (levels.length <= 5) return levels.map((level) => `Lv${level}`).join(", ");
  return `${levels.length} levels`;
}

export function formatCooldownMinutes(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

export function parseCooldownMinutesInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const minutes = Number(trimmed);
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 1440) return null;
  return Math.round(minutes * 60);
}

export function enabledCatalogEntries(catalog: BoxTimerCatalogEntry[]): BoxTimerCatalogEntry[] {
  return catalog
    .filter((entry) => entry.enabled)
    .toSorted((a, b) => (a.level ?? 0) - (b.level ?? 0));
}
