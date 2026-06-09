import type { AppConfig } from "../../../shared/types";
import type { Config } from "../config";
import type { XpTracker } from "../../core/tracker";
import type { SteamMarketProvider } from "../steamMarketProvider";
import { makeHistoryLogger } from "../historyLog";
import { XpTracker as TrackerCtor } from "../../core/tracker";

export interface ConfigPatchDeps {
  getConfig: () => Config;
  setConfig: (c: Config) => void;
  saveConfig: (c: Config) => void;
  getTracker: () => XpTracker;
  setTracker: (t: XpTracker) => void;
  getMarket: () => SteamMarketProvider;
  restartWatcher: () => void;
  setAlwaysOnTop: (v: boolean) => void;
  pushStats: () => void;
  resolveAndPushInventory: () => void;
  ensureOwnedPrices: (force?: boolean) => void | Promise<void>;
}

/** Apply settings patch and run side effects. */
export function applyConfigPatch(deps: ConfigPatchDeps, patch: Partial<AppConfig>): AppConfig {
  const needsWatcher =
    patch.savePath !== undefined ||
    patch.pollIntervalSeconds !== undefined ||
    patch.es3Password !== undefined;
  const needsTracker =
    patch.rollingWindowMinutes !== undefined || patch.trackCubeExp !== undefined;
  const csvToggled = patch.logHistoryCsv !== undefined;

  const next = { ...deps.getConfig(), ...patch };
  deps.setConfig(next);
  deps.saveConfig(next);

  const market = deps.getMarket();

  if (patch.currency !== undefined) {
    market.setCurrency(next.currency);
    deps.resolveAndPushInventory();
    void deps.ensureOwnedPrices(true);
  }

  if (needsTracker) {
    const tracker = new TrackerCtor(next.rollingWindowMinutes * 60, next.trackCubeExp);
    if (next.logHistoryCsv) tracker.onHistory = makeHistoryLogger();
    deps.setTracker(tracker);
  } else if (csvToggled) {
    const tracker = deps.getTracker();
    tracker.onHistory = next.logHistoryCsv ? makeHistoryLogger() : null;
  }

  if (needsWatcher) deps.restartWatcher();

  deps.setAlwaysOnTop(next.startTopmost);
  deps.pushStats();
  deps.resolveAndPushInventory();

  return { ...next };
}
