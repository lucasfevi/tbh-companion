import { BrowserWindow, dialog, type OpenDialogOptions } from "electron";
import { dirname } from "node:path";

import {
  loadConfig,
  saveConfig,
  expandPath,
  normalizeConfigFromRaw,
  type AppConfig,
} from "../config";
import { TrackingService } from "../services/TrackingService";
import { InventoryService } from "../services/InventoryService";
import { ChestService } from "../services/ChestService";
import { PetService } from "../services/PetService";
import { BoxTimerService } from "../services/BoxTimerService";
import { SessionStateService } from "../services/SessionStateService";
import { LookupService } from "../services/LookupService";
import { LookupPriceService } from "../services/LookupPriceService";
import { applyConfigPatch } from "../ipc/configPatch";
import { clearDiagnosticLogs, createLogger, logRendererError } from "../log";
import { clearAppDataFiles, getAppDataPaths } from "../services/appData";
import { UpdateService } from "../services/UpdateService";
import { NotificationService } from "../services/NotificationService";
import type {
  AppDataClearTarget,
  BoxTrackerSortOrder,
  RendererLogPayload,
  SessionUiSnapshot,
  WindowLayoutPrefs,
} from "../../../shared/types";

const appDataLog = createLogger("appData");
import { createMainWindow as buildMainWindow } from "../windows/mainWindow";
import { createOverlayWindow as buildOverlayWindow } from "../windows/overlayWindow";
import { createBoxTrackerWindow as buildBoxTrackerWindow } from "../windows/boxTrackerWindow";
import { isAppQuitting } from "../tray/trayService";
import { applyWindowTopmost } from "../windows/alwaysOnTop";

let config: AppConfig;
const sessionState = new SessionStateService();
const inventory = new InventoryService();
const chests = new ChestService();
const pets = new PetService();
const boxTimers = new BoxTimerService();
const lookup = new LookupService();
const lookupPrices = new LookupPriceService();

function focusMainWindow(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    return;
  }
  openMainWindow();
  if (mainWindow?.isMinimized()) mainWindow.restore();
  mainWindow?.show();
  mainWindow?.focus();
}

const notifications = new NotificationService(
  () => normalizeConfigFromRaw(config),
  focusMainWindow,
);
const updates = new UpdateService({
  getConfig: () => normalizeConfigFromRaw(config),
  onUpdateAvailable: (version) => notifications.showUpdateAvailable(version),
});

boxTimers.setOnChestReady((payload) => notifications.showChestReady(payload));
boxTimers.setOnChestDropped((payload) => notifications.showChestDrop(payload));
inventory.setOnAlmostFull(
  (payload) => notifications.showInventoryAlmostFull(payload),
  () => normalizeConfigFromRaw(config).inventoryAlmostFullThresholdPercent,
);
const tracking = new TrackingService(
  (snap) => inventory.onInventory(snap),
  (text, mtime) => {
    const inv = inventory.parseFromSave(text, mtime);
    chests.onSave(text, mtime, inv.chests);
    pets.onSave(text, mtime);
    return inv;
  },
  (stageKey) => boxTimers.setCurrentStageKey(stageKey),
  sessionState,
  {
    onDrop: (itemKey) => {
      boxTimers.tryMarkDroppedFromLog(itemKey);
    },
    onAvailability: (path, available) => boxTimers.setPlayerLogStatus(path, available),
  },
  (events) => notifications.showHeroLevelUp(events),
);

let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let boxTrackerWindow: BrowserWindow | null = null;

function persistWindowLayout<K extends keyof WindowLayoutPrefs>(
  key: K,
  entry: NonNullable<WindowLayoutPrefs[K]>,
): void {
  config = {
    ...config,
    windowLayout: {
      ...config.windowLayout,
      [key]: entry,
    },
  };
  saveConfig(config);
}

export function startTracking(): SessionUiSnapshot {
  config = loadConfig();
  inventory.initMarket(config.currency);
  inventory.loadGameData();
  lookupPrices.start();
  const ui = sessionState.load(config);
  tracking.start(config);
  return ui;
}

/** Reopen Mini overlay / Stage chest tracker from persisted UI flags. */
export function restoreSessionWindows(ui: SessionUiSnapshot): void {
  if (ui.miniOverlayOpen) {
    openOverlayWindow();
    mainWindow?.hide();
    sessionState.setMiniOverlayOpen(true);
  } else {
    openMainWindow();
  }
  if (ui.boxTrackerOpen) {
    openBoxTrackerWindow();
    sessionState.setBoxTrackerOpen(true);
  }
}

export function stopTracking(): void {
  tracking.flushSession();
  tracking.stop();
  boxTimers.stopTick();
  lookupPrices.stop();
}

export function openMainWindow(): BrowserWindow {
  return buildMainWindow(
    () => mainWindow,
    (w) => {
      mainWindow = w;
    },
    () => config.startTopmost,
    config.windowLayout?.main,
    (entry) => persistWindowLayout("main", entry),
  );
}

export function openOverlayWindow(): BrowserWindow {
  return buildOverlayWindow(
    () => overlayWindow,
    (w) => {
      overlayWindow = w;
    },
    () => config.startTopmost,
    () => {
      if (isAppQuitting()) return;
      sessionState.setMiniOverlayOpen(false);
      tracking.flushSession();
    },
    config.windowLayout?.overlay,
    (entry) => persistWindowLayout("overlay", entry),
  );
}

export function openBoxTrackerWindow(): BrowserWindow {
  return buildBoxTrackerWindow(
    () => boxTrackerWindow,
    (w) => {
      boxTrackerWindow = w;
    },
    () => config.startTopmost,
    () => boxTimers.startTick(),
    () => {
      boxTimers.stopTick();
      if (isAppQuitting()) return;
      sessionState.setBoxTrackerOpen(false);
      tracking.flushSession();
    },
    config.windowLayout?.boxTracker,
    (entry) => persistWindowLayout("boxTracker", entry),
  );
}

export function getAppServices() {
  return {
    getStats: () => tracking.getStats(),
    resetTracker: () => tracking.reset(),
    getInventory: () => inventory.getInventory(),
    getChests: () => chests.getChests(),
    getPets: () => pets.getPets(),
    getBoxTimers: () => boxTimers.getState(),
    markBoxDropped: (boxId: number) => boxTimers.markDropped(boxId),
    clearBoxTimer: (boxId: number) => boxTimers.clearTimer(boxId),
    setBoxTrackerBoxes: (boxIds: number[]) => boxTimers.setEnabledBoxIds(boxIds),
    setBoxTrackerCooldown: (boxId: number, cooldownSeconds: number) =>
      boxTimers.setCooldownSeconds(boxId, cooldownSeconds),
    clearBoxTrackerCooldown: (boxId: number) => boxTimers.clearCooldownOverride(boxId),
    setBoxTrackerFarmStage: (boxId: number, stageKey: number) =>
      boxTimers.setFarmStageKey(boxId, stageKey),
    clearBoxTrackerFarmStage: (boxId: number) => boxTimers.clearFarmStageOverride(boxId),
    setBoxTrackerNotify: (boxId: number, enabled: boolean) =>
      boxTimers.setBoxTrackerNotify(boxId, enabled),
    setBoxTrackerSortOrder: (sortOrder: BoxTrackerSortOrder) => boxTimers.setSortOrder(sortOrder),
    pricesStatus: () => inventory.pricesStatus(),
    refreshPrices: (force?: boolean) => inventory.refreshPrices(force),
    refreshItemPrices: (itemKey: number) => inventory.refreshItemPrices(itemKey),
    cancelPrices: () => inventory.cancelPrices(),
    setCurrency: (iso: string) => {
      config.currency = iso;
      saveConfig(config);
      return inventory.setCurrency(iso);
    },
    getConfig: () => normalizeConfigFromRaw(config),
    pickSaveFile: async (): Promise<string | null> => {
      const current = expandPath(config.savePath);
      const parent =
        mainWindow && !mainWindow.isDestroyed() ? mainWindow : BrowserWindow.getFocusedWindow();
      const options: OpenDialogOptions = {
        title: "Choose TBH save file",
        defaultPath: dirname(current),
        properties: ["openFile"],
        filters: [{ name: "TBH save", extensions: ["es3"] }],
      };
      const result = parent
        ? await dialog.showOpenDialog(parent, options)
        : await dialog.showOpenDialog(options);
      if (result.canceled || result.filePaths.length === 0) return null;
      return result.filePaths[0] ?? null;
    },
    saveConfigPatch: (patch: Partial<AppConfig>) =>
      applyConfigPatch(
        {
          getConfig: () => config,
          setConfig: (c) => {
            config = c;
            tracking.updateConfig(c);
          },
          saveConfig,
          getTracker: () => tracking.getTracker(),
          setTracker: (t) => tracking.setTracker(t),
          getMarket: () => inventory.getMarket(),
          restartWatcher: () => tracking.restartWatcher(),
          setAlwaysOnTop: (v) => {
            if (mainWindow && !mainWindow.isDestroyed()) applyWindowTopmost(mainWindow, v);
            if (overlayWindow && !overlayWindow.isDestroyed())
              applyWindowTopmost(overlayWindow, v, true);
            if (boxTrackerWindow && !boxTrackerWindow.isDestroyed())
              applyWindowTopmost(boxTrackerWindow, v, true);
          },
          pushStats: () => tracking.pushStats(),
          resolveAndPushInventory: () => inventory.resolveAndPushInventory(),
          ensureOwnedPrices: (force) => inventory.ensureOwnedPrices(force),
          onSavePathChange: () => tracking.onSavePathChanged(),
        },
        patch,
      ),
    getDataPaths: () => getAppDataPaths(),
    clearAppData: (target: AppDataClearTarget) => {
      const result = clearAppDataFiles(target);
      if (!result.ok) {
        appDataLog.warn(`Cache clear failed (${target}): ${result.error ?? "unknown"}`);
        return result;
      }
      if (result.cleared.length > 0) {
        appDataLog.info(`Cache cleared (${target}): ${result.cleared.join(", ")}`);
      }

      const reloadPrices = target === "prices" || target === "all-except-config";
      const reloadLookupPrices = target === "lookup-prices" || target === "all-except-config";
      const reloadTimers = target === "box-timers" || target === "all-except-config";
      const reloadSession = target === "session" || target === "all-except-config";

      if (reloadPrices) inventory.reloadPriceCache();
      if (reloadLookupPrices) lookupPrices.reloadFromDisk();
      if (reloadTimers) boxTimers.resetStorage();
      if (reloadSession) {
        tracking.onSessionFileDeleted();
        tracking.reset();
      }

      return result;
    },
    clearDiagnosticLogs: () => {
      const result = clearDiagnosticLogs();
      if (result.ok && result.cleared.length > 0) {
        appDataLog.info(`Diagnostic logs cleared: ${result.cleared.join(", ")}`);
      }
      return result;
    },
    logRendererError: (payload: RendererLogPayload) => {
      logRendererError(payload);
    },
    openOverlay: () => {
      openOverlayWindow();
      mainWindow?.hide();
      sessionState.setMiniOverlayOpen(true);
      tracking.flushSession();
    },
    openBoxTracker: () => {
      openBoxTrackerWindow();
      sessionState.setBoxTrackerOpen(true);
      tracking.flushSession();
    },
    closeBoxTracker: () => boxTrackerWindow?.close(),
    minimizeBoxTracker: () => {
      if (boxTrackerWindow && !boxTrackerWindow.isDestroyed()) {
        boxTrackerWindow.minimize();
      }
    },
    showMain: () => {
      openMainWindow();
      if (mainWindow?.isMinimized()) mainWindow.restore();
      mainWindow?.show();
      mainWindow?.focus();
      overlayWindow?.close();
      sessionState.setMiniOverlayOpen(false);
      tracking.flushSession();
    },
    closeOverlay: () => {
      overlayWindow?.close();
    },
    flushSession: () => tracking.flushSession(),
    getUpdateStatus: () => updates.getStatus(),
    checkForUpdates: () => updates.checkForUpdates(),
    downloadUpdate: () => updates.downloadUpdate(),
    quitAndInstall: () => updates.quitAndInstall(),
    startUpdates: () => updates.start(),
    stopUpdates: () => updates.stop(),
    getLookupCatalog: () => lookup.getCatalog(),
    getLookupSources: () => lookup.getSources(),
    getLookupSynthesisModel: () => lookup.getSynthesisModel(),
    getOfferings: () => lookup.getOfferings(),
    getLookupPrices: () => lookupPrices.getSnapshot(),
  };
}

export type AppServices = ReturnType<typeof getAppServices>;
