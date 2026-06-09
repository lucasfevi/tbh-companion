import { contextBridge, ipcRenderer } from "electron";
import { IPC } from "../../shared/ipc";
import type {
  Stats,
  TbhApi,
  GameDataStatus,
  GameDataRefreshResult,
  ResolvedInventory,
  PriceStatus,
  PriceProgress,
  PriceRefreshResult,
  AppConfig,
} from "../../shared/types";

const api: TbhApi = {
  onStats(cb: (stats: Stats) => void): () => void {
    const listener = (_e: unknown, stats: Stats): void => cb(stats);
    ipcRenderer.on(IPC.STATS, listener);
    return () => ipcRenderer.removeListener(IPC.STATS, listener);
  },
  reset(): void {
    ipcRenderer.send(IPC.RESET);
  },
  getStats(): Promise<Stats | null> {
    return ipcRenderer.invoke(IPC.GET_STATS);
  },
  openOverlay(): void {
    ipcRenderer.send(IPC.OPEN_OVERLAY);
  },
  showMain(): void {
    ipcRenderer.send(IPC.SHOW_MAIN);
  },
  closeOverlay(): void {
    ipcRenderer.send(IPC.CLOSE_OVERLAY);
  },
  gameDataStatus(): Promise<GameDataStatus> {
    return ipcRenderer.invoke(IPC.GAMEDATA_STATUS);
  },
  refreshGameData(): Promise<GameDataRefreshResult> {
    return ipcRenderer.invoke(IPC.GAMEDATA_REFRESH);
  },
  getInventory(): Promise<ResolvedInventory | null> {
    return ipcRenderer.invoke(IPC.GET_INVENTORY);
  },
  onInventory(cb: (inv: ResolvedInventory) => void): () => void {
    const listener = (_e: unknown, inv: ResolvedInventory): void => cb(inv);
    ipcRenderer.on(IPC.INVENTORY, listener);
    return () => ipcRenderer.removeListener(IPC.INVENTORY, listener);
  },
  pricesStatus(): Promise<PriceStatus> {
    return ipcRenderer.invoke(IPC.PRICES_STATUS);
  },
  refreshPrices(force?: boolean): Promise<PriceRefreshResult & { status: PriceStatus }> {
    return ipcRenderer.invoke(IPC.PRICES_REFRESH, force);
  },
  cancelPrices(): void {
    ipcRenderer.send(IPC.PRICES_CANCEL);
  },
  setCurrency(iso: string): Promise<PriceStatus> {
    return ipcRenderer.invoke(IPC.SET_CURRENCY, iso);
  },
  onPricesProgress(cb: (p: PriceProgress) => void): () => void {
    const listener = (_e: unknown, p: PriceProgress): void => cb(p);
    ipcRenderer.on(IPC.PRICES_PROGRESS, listener);
    return () => ipcRenderer.removeListener(IPC.PRICES_PROGRESS, listener);
  },
  getConfig(): Promise<AppConfig> {
    return ipcRenderer.invoke(IPC.GET_CONFIG);
  },
  saveConfig(patch: Partial<AppConfig>): Promise<AppConfig> {
    return ipcRenderer.invoke(IPC.SAVE_CONFIG, patch);
  },
};

contextBridge.exposeInMainWorld("tbh", api);
