import { contextBridge, ipcRenderer } from "electron";
import type {
  Stats,
  TbhApi,
  GameDataStatus,
  GameDataRefreshResult,
  ResolvedInventory,
  PriceStatus,
  PriceProgress,
  PriceRefreshResult,
} from "../../shared/types";

// Narrow, typed bridge. The renderer never touches Node/Electron directly.
const api: TbhApi = {
  onStats(cb: (stats: Stats) => void): () => void {
    const listener = (_e: unknown, stats: Stats): void => cb(stats);
    ipcRenderer.on("stats", listener);
    return () => ipcRenderer.removeListener("stats", listener);
  },
  reset(): void {
    ipcRenderer.send("reset");
  },
  getStats(): Promise<Stats | null> {
    return ipcRenderer.invoke("get-stats");
  },
  openOverlay(): void {
    ipcRenderer.send("open-overlay");
  },
  showMain(): void {
    ipcRenderer.send("show-main");
  },
  closeOverlay(): void {
    ipcRenderer.send("close-overlay");
  },
  gameDataStatus(): Promise<GameDataStatus> {
    return ipcRenderer.invoke("gamedata-status");
  },
  refreshGameData(): Promise<GameDataRefreshResult> {
    return ipcRenderer.invoke("gamedata-refresh");
  },
  getInventory(): Promise<ResolvedInventory | null> {
    return ipcRenderer.invoke("get-inventory");
  },
  onInventory(cb: (inv: ResolvedInventory) => void): () => void {
    const listener = (_e: unknown, inv: ResolvedInventory): void => cb(inv);
    ipcRenderer.on("inventory", listener);
    return () => ipcRenderer.removeListener("inventory", listener);
  },
  pricesStatus(): Promise<PriceStatus> {
    return ipcRenderer.invoke("prices-status");
  },
  refreshPrices(force?: boolean): Promise<PriceRefreshResult & { status: PriceStatus }> {
    return ipcRenderer.invoke("prices-refresh", force);
  },
  cancelPrices(): void {
    ipcRenderer.send("prices-cancel");
  },
  setCurrency(iso: string): Promise<PriceStatus> {
    return ipcRenderer.invoke("set-currency", iso);
  },
  onPricesProgress(cb: (p: PriceProgress) => void): () => void {
    const listener = (_e: unknown, p: PriceProgress): void => cb(p);
    ipcRenderer.on("prices-progress", listener);
    return () => ipcRenderer.removeListener("prices-progress", listener);
  },
};

contextBridge.exposeInMainWorld("tbh", api);
