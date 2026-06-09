import { contextBridge, ipcRenderer } from "electron";
import type {
  Stats,
  TbhApi,
  GameDataStatus,
  GameDataRefreshResult,
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
};

contextBridge.exposeInMainWorld("tbh", api);
