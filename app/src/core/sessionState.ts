import type { AppConfig, PersistedSessionState, SaveSnapshot } from "../../shared/types";

/** Whether persisted session metadata matches current tracking settings. */
export function sessionMatchesConfig(
  persisted: Pick<PersistedSessionState, "savePath" | "rollingWindowMinutes" | "trackCubeExp">,
  savePath: string,
  config: AppConfig,
): boolean {
  return (
    persisted.savePath === savePath &&
    persisted.rollingWindowMinutes === config.rollingWindowMinutes &&
    persisted.trackCubeExp === config.trackCubeExp
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
    typeof o.trackCubeExp === "boolean" &&
    o.tracker !== null &&
    typeof o.tracker === "object" &&
    o.ui !== null &&
    typeof o.ui === "object" &&
    typeof o.ui.miniOverlayOpen === "boolean" &&
    typeof o.ui.boxTrackerOpen === "boolean"
  );
}
