import { BrowserWindow } from "electron";

import { loadConfig, saveConfig, type AppConfig } from "../config";
import { TrackingService } from "../services/TrackingService";
import { InventoryService } from "../services/InventoryService";
import { ChestService } from "../services/ChestService";
import { BoxTimerService } from "../services/BoxTimerService";
import { applyConfigPatch } from "../ipc/configPatch";
import { createMainWindow as buildMainWindow } from "../windows/mainWindow";
import { createOverlayWindow as buildOverlayWindow } from "../windows/overlayWindow";
import { createBoxTrackerWindow as buildBoxTrackerWindow } from "../windows/boxTrackerWindow";
import { isAppQuitting } from "../tray/trayService";

let config: AppConfig;
const inventory = new InventoryService();
const chests = new ChestService();
const boxTimers = new BoxTimerService();
const tracking = new TrackingService(
  (snap) => inventory.onInventory(snap),
  (text, mtime) => {
    const inv = inventory.parseFromSave(text, mtime);
    chests.onSave(text, mtime, inv.chests);
    return inv;
  },
  (stageKey) => boxTimers.setCurrentStageKey(stageKey),
);

let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let boxTrackerWindow: BrowserWindow | null = null;

export function startTracking(): void {
  config = loadConfig();
  inventory.initMarket(config.currency);
  inventory.loadGameData();
  tracking.start(config);
}

export function stopTracking(): void {
  tracking.stop();
  boxTimers.stopTick();
}

export function openMainWindow(): BrowserWindow {
  return buildMainWindow(
    () => mainWindow,
    (w) => {
      mainWindow = w;
    },
    () => config.startTopmost,
  );
}

export function openOverlayWindow(): BrowserWindow {
  return buildOverlayWindow(
    () => overlayWindow,
    (w) => {
      overlayWindow = w;
    },
    () => {
      if (!isAppQuitting()) {
        openMainWindow();
        mainWindow?.show();
      }
    },
  );
}

export function openBoxTrackerWindow(): BrowserWindow {
  return buildBoxTrackerWindow(
    () => boxTrackerWindow,
    (w) => {
      boxTrackerWindow = w;
    },
    () => boxTimers.startTick(),
    () => boxTimers.stopTick(),
  );
}

export function getAppServices() {
  return {
    getStats: () => tracking.getStats(),
    resetTracker: () => tracking.reset(),
    getInventory: () => inventory.getInventory(),
    getChests: () => chests.getChests(),
    getBoxTimers: () => boxTimers.getState(),
    markBoxDropped: (boxId: number) => boxTimers.markDropped(boxId),
    clearBoxTimer: (boxId: number) => boxTimers.clearTimer(boxId),
    setBoxTrackerBoxes: (boxIds: number[]) => boxTimers.setEnabledBoxIds(boxIds),
    gameDataStatus: () => inventory.gameDataStatus(),
    refreshGameData: () => inventory.refreshGameData(),
    pricesStatus: () => inventory.pricesStatus(),
    refreshPrices: (force?: boolean) => inventory.refreshPrices(force),
    cancelPrices: () => inventory.cancelPrices(),
    setCurrency: (iso: string) => {
      config.currency = iso;
      saveConfig(config);
      return inventory.setCurrency(iso);
    },
    getConfig: () => ({ ...config }),
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
            if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setAlwaysOnTop(v);
          },
          pushStats: () => tracking.pushStats(),
          resolveAndPushInventory: () => inventory.resolveAndPushInventory(),
          ensureOwnedPrices: (force) => inventory.ensureOwnedPrices(force),
        },
        patch,
      ),
    openOverlay: () => {
      openOverlayWindow();
      mainWindow?.hide();
    },
    openBoxTracker: () => {
      openBoxTrackerWindow();
    },
    closeBoxTracker: () => boxTrackerWindow?.close(),
    showMain: () => {
      openMainWindow();
      mainWindow?.show();
      overlayWindow?.close();
    },
    closeOverlay: () => {
      overlayWindow?.close();
      if (!isAppQuitting()) {
        openMainWindow();
        mainWindow?.show();
      }
    },
  };
}

export type AppServices = ReturnType<typeof getAppServices>;
