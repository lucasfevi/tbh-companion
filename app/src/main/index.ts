import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";
import { loadConfig, saveConfig, expandPath, type Config } from "./config";
import { SaveWatcher } from "./saveWatcher";
import { buildStats } from "./stats";
import { makeHistoryLogger } from "./historyLog";
import { GameDataProvider } from "./gameDataProvider";
import { SteamMarketProvider } from "./steamMarketProvider";
import { XpTracker } from "../core/tracker";
import { resolveInventory } from "../core/inventory";
import type {
  SaveSnapshot,
  InventorySnapshot,
  ResolvedInventory,
  PriceProgress,
} from "../../shared/types";

const isDev = !!process.env.ELECTRON_RENDERER_URL;

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

function rendererTarget(hash: string): { url?: string; file: string; hash: string } {
  return {
    url: isDev ? `${process.env.ELECTRON_RENDERER_URL}#${hash}` : undefined,
    file: join(__dirname, "../renderer/index.html"),
    hash,
  };
}

function pushStats(): void {
  const stats = buildStats(tracker, lastSnap, lastError);
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send("stats", stats);
  }
}

function onInventory(snap: InventorySnapshot): void {
  lastInventoryRaw = snap;
  resolveAndPushInventory();
}

function resolveAndPushInventory(): void {
  if (!lastInventoryRaw) return;
  const status = gameData.status();
  lastInventory = resolveInventory(lastInventoryRaw, (key) => gameData.get(key), status.loaded);
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send("inventory", lastInventory);
  }
}

function startTracking(): void {
  config = loadConfig();
  market = new SteamMarketProvider(config.currency);
  tracker = new XpTracker(config.rollingWindowMinutes * 60, config.trackCubeExp);
  if (config.logHistoryCsv) {
    tracker.onHistory = makeHistoryLogger();
  }

  watcher = new SaveWatcher({
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
  watcher.start();

  // Push every second so time-based fields (elapsed, "last updated") tick even
  // when the save itself hasn't changed.
  tickTimer = setInterval(pushStats, 1000);

  // Item catalog: load the bundled/cached snapshot now, refresh in the
  // background if it's past its TTL (handles game patches adding new items).
  gameData.load();
  gameData.refreshIfStale();
}

function registerIpc(): void {
  ipcMain.handle("get-stats", () => buildStats(tracker, lastSnap, lastError));
  ipcMain.on("reset", () => {
    tracker.reset();
    pushStats();
  });
  ipcMain.on("open-overlay", () => {
    createOverlayWindow();
    mainWindow?.hide();
  });
  ipcMain.on("show-main", () => {
    createMainWindow();
    mainWindow?.show();
    overlayWindow?.close();
  });
  ipcMain.on("close-overlay", () => overlayWindow?.close());

  ipcMain.handle("get-inventory", () => lastInventory);

  ipcMain.handle("gamedata-status", () => gameData.status());
  ipcMain.handle("gamedata-refresh", async () => {
    const result = await gameData.refresh();
    if (result.ok) resolveAndPushInventory(); // unknown items may now resolve
    return { ...result, status: gameData.status() };
  });

  ipcMain.handle("prices-status", () => market.status());
  ipcMain.handle("prices-refresh", async (_e, force?: boolean) => {
    const result = await market.refresh(undefined, {
      force: Boolean(force),
      onProgress: (p: PriceProgress) => {
        for (const win of BrowserWindow.getAllWindows()) {
          if (!win.isDestroyed()) win.webContents.send("prices-progress", p);
        }
      },
    });
    return { ...result, status: market.status() };
  });
  ipcMain.on("prices-cancel", () => market.cancel());
  ipcMain.handle("set-currency", (_e, iso: string) => {
    config.currency = iso;
    saveConfig(config);
    market.setCurrency(iso);
    return market.status();
  });
}

function loadInto(win: BrowserWindow, hash: string): void {
  const t = rendererTarget(hash);
  if (t.url) {
    win.loadURL(t.url);
  } else {
    win.loadFile(t.file, { hash: t.hash });
  }
}

function createMainWindow(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    return;
  }
  mainWindow = new BrowserWindow({
    width: 900,
    height: 640,
    minWidth: 420,
    minHeight: 480,
    show: false,
    backgroundColor: "#0f1117",
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
    },
  });
  mainWindow.on("ready-to-show", () => mainWindow?.show());
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  loadInto(mainWindow, "main");
}

function createOverlayWindow(): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.show();
    overlayWindow.focus();
    return;
  }
  overlayWindow = new BrowserWindow({
    width: 280,
    height: 170,
    show: false,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: "#0f1117",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
    },
  });
  overlayWindow.setAlwaysOnTop(true, "screen-saver");
  overlayWindow.on("ready-to-show", () => overlayWindow?.show());
  overlayWindow.on("closed", () => {
    overlayWindow = null;
  });
  loadInto(overlayWindow, "overlay");
}

app.whenReady().then(() => {
  registerIpc();
  startTracking();
  createMainWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (tickTimer) clearInterval(tickTimer);
  watcher?.stop();
  if (process.platform !== "darwin") app.quit();
});
