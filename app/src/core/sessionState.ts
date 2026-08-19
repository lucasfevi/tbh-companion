import type {
  AppConfig,
  PersistedSessionState,
  SaveSnapshot,
  TrackerSnapshot,
} from "../../shared/types";

/** Effective live-memory reader state (opt-in + consent). */
export function isLiveMemoryActive(config: AppConfig): boolean {
  return Boolean(config.liveMemory?.enabled && config.liveMemory?.consentAccepted);
}

/** Whether persisted session metadata matches current tracking settings. */
export function sessionMatchesConfig(
  persisted: Pick<PersistedSessionState, "savePath" | "rollingWindowMinutes" | "liveMemoryEnabled">,
  savePath: string,
  config: AppConfig,
): boolean {
  const currentLive = isLiveMemoryActive(config);
  // Older snapshots without the field are treated as save-only.
  const persistedLive = persisted.liveMemoryEnabled ?? false;
  return (
    persisted.savePath === savePath &&
    persisted.rollingWindowMinutes === config.rollingWindowMinutes &&
    persistedLive === currentLive
  );
}

/** Reject restored tracker totals that could only come from live/save baseline mixing. */
const MAX_PLAUSIBLE_SESSION_XP = 1e15;

export function isPlausibleTrackerSnapshot(
  tracker: Pick<TrackerSnapshot, "cumulativeGained" | "sessionRateValue">,
): boolean {
  return (
    Number.isFinite(tracker.cumulativeGained) &&
    tracker.cumulativeGained >= 0 &&
    tracker.cumulativeGained < MAX_PLAUSIBLE_SESSION_XP &&
    Number.isFinite(tracker.sessionRateValue) &&
    tracker.sessionRateValue >= 0 &&
    tracker.sessionRateValue < MAX_PLAUSIBLE_SESSION_XP
  );
}

/**
 * Whether a fresh save snapshot can continue a persisted session.
 * Same or newer mtime is OK; older mtime means the save was replaced or rolled back.
 */
export function snapshotContinuesSession(persistedLastMtime: number, snap: SaveSnapshot): boolean {
  return snap.saveMtime >= persistedLastMtime;
}

export function isPersistedSessionState(raw: unknown): raw is PersistedSessionState {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as PersistedSessionState;
  return (
    o.version === 1 &&
    typeof o.savePath === "string" &&
    typeof o.lastSaveMtime === "number" &&
    typeof o.rollingWindowMinutes === "number" &&
    o.tracker !== null &&
    typeof o.tracker === "object" &&
    o.ui !== null &&
    typeof o.ui === "object" &&
    typeof o.ui.miniOverlayOpen === "boolean" &&
    typeof o.ui.boxTrackerOpen === "boolean"
  );
}
