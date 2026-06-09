import { BrowserWindow } from "electron";

import { loadConfig, saveConfig, type AppConfig } from "../config";
import { TrackingService } from "../services/TrackingService";
import { InventoryService } from "../services/InventoryService";
import { applyConfigPatch } from "../ipc/configPatch";
import { createMainWindow as buildMainWindow } from "../windows/mainWindow";
import { createOverlayWindow as buildOverlayWindow } from "../windows/overlayWindow";

let config: AppConfig;
const inventory = new InventoryService();
const tracking = new TrackingService(
  (snap) => inventory.onInventory(snap),
  (text, mtime) => inventory.parseFromSave(text, mtime),
);

let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;

export function startTracking(): void {
  config = loadConfig();
  inventory.initMarket(config.currency);
  inventory.loadGameData();
  tracking.start(config);
}

export function stopTracking(): void {
  tracking.stop();
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
  );
}

export function getAppServices() {
  return {
    getStats: () => tracking.getStats(),
    resetTracker: () => tracking.reset(),
    getInventory: () => inventory.getInventory(),
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
    showMain: () => {
      openMainWindow();
      mainWindow?.show();
      overlayWindow?.close();
    },
    closeOverlay: () => overlayWindow?.close(),
  };
}

export type AppServices = ReturnType<typeof getAppServices>;
