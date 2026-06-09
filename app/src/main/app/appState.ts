import { BrowserWindow } from "electron";

import { loadConfig, saveConfig, expandPath, type Config } from "../config";
import { SaveWatcher } from "../saveWatcher";
import { buildStats } from "../stats";
import { makeHistoryLogger } from "../historyLog";
import { GameDataProvider } from "../gameDataProvider";
import { SteamMarketProvider } from "../steamMarketProvider";
import { XpTracker } from "../../core/tracker";
import { resolveInventory, ownedMarketNames } from "../../core/inventory";
import type {
  SaveSnapshot,
  InventorySnapshot,
  ResolvedInventory,
  InventoryPriceInfo,
  PriceProgress,
  AppConfig,
} from "../../../shared/types";
import { IPC } from "../../../shared/ipc";
import { createMainWindow as buildMainWindow } from "../windows/mainWindow";
import { createOverlayWindow as buildOverlayWindow } from "../windows/overlayWindow";
import { applyConfigPatch } from "../ipc/configPatch";

let config: Config;
let tracker: XpTracker;
const gameData = new GameDataProvider();
let market: SteamMarketProvider;
let watcher: SaveWatcher | null = null;
let lastSnap: SaveSnapshot | null = null;
let lastInventoryRaw: InventorySnapshot | null = null;
let lastInventory: ResolvedInventory | null = null;
let lastError: string | null = null;
let tickTimer: NodeJS.Timeout | null = null;
let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let priceRefreshQueued = false;

export function pushStats(): void {
  const stats = buildStats(tracker, lastSnap, lastError);
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(IPC.STATS, stats);
  }
}

function priceLookup(name: string): InventoryPriceInfo | undefined {
  const e = market?.get(name);
  if (!e) return undefined;
  return {
    median: e.median,
    lowest: e.lowest,
    rawMedian: e.rawMedian ?? null,
    rawLowest: e.rawLowest ?? (e as { raw?: string | null }).raw ?? null,
  };
}

export function resolveAndPushInventory(): void {
  if (!lastInventoryRaw || !market) return;
  try {
    const status = gameData.status();
    const currency = market.status().currency;
    lastInventory = resolveInventory(
      lastInventoryRaw,
      (key) => gameData.get(key),
      status.loaded,
      priceLookup,
    );
    lastInventory.currency = currency;
    lastInventory.composition.currency = currency;
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send(IPC.INVENTORY, lastInventory);
    }
  } catch (err) {
    console.error("resolveAndPushInventory failed:", err);
  }
}

function onInventory(snap: InventorySnapshot): void {
  lastInventoryRaw = snap;
  resolveAndPushInventory();
  void ensureOwnedPrices();
}

function broadcastPriceProgress(p: PriceProgress): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(IPC.PRICES_PROGRESS, p);
  }
}

export async function ensureOwnedPrices(force = false): Promise<void> {
  if (!lastInventoryRaw || !market) return;

  if (market.status().running) {
    priceRefreshQueued = true;
    return;
  }

  const names = ownedMarketNames(lastInventoryRaw, (key) => gameData.get(key));
  const pending = market.pendingNames(names, force);
  if (pending.length === 0) return;

  await market.refresh(names, {
    force,
    onProgress: broadcastPriceProgress,
    onPriced: () => resolveAndPushInventory(),
  });

  resolveAndPushInventory();

  if (priceRefreshQueued) {
    priceRefreshQueued = false;
    void ensureOwnedPrices();
  }
}

function configForRenderer(): AppConfig {
  return { ...config };
}

function createWatcher(): SaveWatcher {
  return new SaveWatcher({
    path: expandPath(config.savePath),
    password: config.es3Password,
    pollMs: Math.max(1, config.pollIntervalSeconds) * 1000,
    onSnapshot: (snap) => {
      lastSnap = snap;
      lastError = null;
      tracker.update(snap);
      pushStats();
    },
    onError: (message) => {
      lastError = message;
      pushStats();
    },
    onInventory,
  });
}

function restartWatcher(): void {
  watcher?.stop();
  watcher = createWatcher();
  watcher.start();
}

export function startTracking(): void {
  config = loadConfig();
  market = new SteamMarketProvider(config.currency);
  tracker = new XpTracker(config.rollingWindowMinutes * 60, config.trackCubeExp);
  if (config.logHistoryCsv) {
    tracker.onHistory = makeHistoryLogger();
  }

  watcher = createWatcher();
  watcher.start();

  tickTimer = setInterval(pushStats, 1000);

  gameData.load();
  gameData.refreshIfStale();
}

export function stopTracking(): void {
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = null;
  watcher?.stop();
  watcher = null;
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
    getStats: () => buildStats(tracker, lastSnap, lastError),
    resetTracker: () => {
      tracker.reset();
      pushStats();
    },
    getInventory: () => lastInventory,
    gameDataStatus: () => gameData.status(),
    refreshGameData: async () => {
      const result = await gameData.refresh();
      if (result.ok) resolveAndPushInventory();
      return { ...result, status: gameData.status() };
    },
    pricesStatus: () => market.status(),
    refreshPrices: async (force?: boolean) => {
      const result = await market.refresh(
        lastInventoryRaw ? ownedMarketNames(lastInventoryRaw, (key) => gameData.get(key)) : undefined,
        {
          force: Boolean(force),
          onProgress: broadcastPriceProgress,
          onPriced: () => resolveAndPushInventory(),
        },
      );
      resolveAndPushInventory();
      return { ...result, status: market.status() };
    },
    cancelPrices: () => market.cancel(),
    setCurrency: (iso: string) => {
      config.currency = iso;
      saveConfig(config);
      market.setCurrency(iso);
      resolveAndPushInventory();
      void ensureOwnedPrices(true);
      return market.status();
    },
    getConfig: () => configForRenderer(),
    saveConfigPatch: (patch: Partial<AppConfig>) =>
      applyConfigPatch(
        {
          getConfig: () => config,
          setConfig: (c) => {
            config = c;
          },
          saveConfig,
          getTracker: () => tracker,
          setTracker: (t) => {
            tracker = t;
          },
          getMarket: () => market,
          restartWatcher,
          setAlwaysOnTop: (v) => {
            if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setAlwaysOnTop(v);
          },
          pushStats,
          resolveAndPushInventory,
          ensureOwnedPrices,
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
