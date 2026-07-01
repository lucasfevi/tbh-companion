import type { AppConfig } from "../../../shared/types";
import type { XpTracker } from "../../core/tracker";
import { expandPath, normalizeConfigFromRaw } from "../config";
import { createLogger } from "../log";

const configLog = createLogger("config");
import type { SteamMarketProvider } from "../steamMarketProvider";
import { makeHistoryLogger } from "../historyLog";
import { XpTracker as TrackerCtor } from "../../core/tracker";

export interface ConfigPatchDeps {
  getConfig: () => AppConfig;
  setConfig: (c: AppConfig) => void;
  saveConfig: (c: AppConfig) => void;
  getTracker: () => XpTracker;
  setTracker: (t: XpTracker) => void;
  getMarket: () => SteamMarketProvider;
  restartWatcher: () => void;
  setAlwaysOnTop: (v: boolean) => void;
  pushStats: () => void;
  resolveAndPushInventory: () => void;
  ensureOwnedPrices: (force?: boolean) => void | Promise<void>;
  onSavePathChange?: () => void;
  /** Start (true) or stop (false) the live-memory reader process. */
  setLiveMemoryEnabled?: (enabled: boolean) => void;
}

/** Apply settings patch and run side effects. */
export function applyConfigPatch(deps: ConfigPatchDeps, patch: Partial<AppConfig>): AppConfig {
  const needsWatcher =
    patch.savePath !== undefined ||
    patch.pollIntervalSeconds !== undefined ||
    patch.es3Password !== undefined;
  const needsTracker = patch.rollingWindowMinutes !== undefined;
  const csvToggled = patch.logHistoryCsv !== undefined;

  const prev = deps.getConfig();
  const next = normalizeConfigFromRaw({ ...prev, ...patch });
  deps.setConfig(next);
  deps.saveConfig(next);

  if (patch.savePath !== undefined && expandPath(patch.savePath) !== expandPath(prev.savePath)) {
    deps.onSavePathChange?.();
  }

  const changedKeys = (Object.keys(patch) as (keyof AppConfig)[]).filter(
    (key) => patch[key] !== undefined,
  );
  if (changedKeys.length > 0) {
    const safe = changedKeys.map((key) => (key === "es3Password" ? "es3Password (redacted)" : key));
    configLog.info(`Config updated: ${safe.join(", ")}`);
  }

  const market = deps.getMarket();

  if (patch.currency !== undefined) {
    market.setCurrency(next.currency);
    deps.resolveAndPushInventory();
    void deps.ensureOwnedPrices(true);
  }

  if (needsTracker) {
    const tracker = new TrackerCtor(next.rollingWindowMinutes * 60);
    if (next.logHistoryCsv) tracker.onHistory = makeHistoryLogger();
    deps.setTracker(tracker);
  } else if (csvToggled) {
    const tracker = deps.getTracker();
    tracker.onHistory = next.logHistoryCsv ? makeHistoryLogger() : null;
  }

  if (needsWatcher) deps.restartWatcher();

  // Live-memory reader: start/stop the isolated process on toggle (no app restart).
  // Only runs once consent has been accepted.
  if (patch.liveMemory !== undefined) {
    deps.setLiveMemoryEnabled?.(next.liveMemory.enabled && next.liveMemory.consentAccepted);
  }

  deps.setAlwaysOnTop(next.startTopmost);
  deps.pushStats();
  deps.resolveAndPushInventory();

  return { ...next };
}
