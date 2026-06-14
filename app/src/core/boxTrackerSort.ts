import type { BoxTimerRow, BoxTrackerSortOrder } from "../../shared/types";

export function compareBoxTimerRows(
  a: BoxTimerRow,
  b: BoxTimerRow,
  sortOrder: BoxTrackerSortOrder,
): number {
  if (a.status !== b.status) {
    if (sortOrder === "cooldown-first") {
      return a.status === "cooldown" ? -1 : 1;
    }
    return a.status === "ready" ? -1 : 1;
  }
  if (a.status === "cooldown") {
    return a.remainingSeconds - b.remainingSeconds;
  }
  return (a.level ?? 0) - (b.level ?? 0) || a.boxId - b.boxId;
}

export function normalizeBoxTrackerSortOrder(value: unknown): BoxTrackerSortOrder {
  return value === "ready-first" ? "ready-first" : "cooldown-first";
}
