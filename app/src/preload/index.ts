import { contextBridge, ipcRenderer } from "electron";
import { IPC } from "../../shared/ipc";
import type {
  Stats,
  TbhApi,
  GameDataStatus,
  GameDataRefreshResult,
  ResolvedInventory,
  ChestState,
  BoxTimerState,
  PriceStatus,
  PriceProgress,
  PriceRefreshResult,
  AppConfig,
  AppDataClearTarget,
  AppDataPaths,
  ClearAppDataResult,
  ClearDiagnosticLogResult,
  RendererLogPayload,
  UpdateStatus,
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
  openBoxTracker(): void {
    ipcRenderer.send(IPC.OPEN_BOX_TRACKER);
  },
  closeBoxTracker(): void {
    ipcRenderer.send(IPC.CLOSE_BOX_TRACKER);
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
  getChests(): Promise<ChestState | null> {
    return ipcRenderer.invoke(IPC.GET_CHESTS);
  },
  onChests(cb: (state: ChestState) => void): () => void {
    const listener = (_e: unknown, state: ChestState): void => cb(state);
    ipcRenderer.on(IPC.CHESTS, listener);
    return () => ipcRenderer.removeListener(IPC.CHESTS, listener);
  },
  getBoxTimers(): Promise<BoxTimerState> {
    return ipcRenderer.invoke(IPC.GET_BOX_TIMERS);
  },
  onBoxTimers(cb: (state: BoxTimerState) => void): () => void {
    const listener = (_e: unknown, state: BoxTimerState): void => cb(state);
    ipcRenderer.on(IPC.BOX_TIMERS, listener);
    return () => ipcRenderer.removeListener(IPC.BOX_TIMERS, listener);
  },
  markBoxDropped(boxId: number): Promise<BoxTimerState> {
    return ipcRenderer.invoke(IPC.MARK_BOX_DROPPED, boxId);
  },
  clearBoxTimer(boxId: number): Promise<BoxTimerState> {
    return ipcRenderer.invoke(IPC.CLEAR_BOX_TIMER, boxId);
  },
  setBoxTrackerBoxes(boxIds: number[]): Promise<BoxTimerState> {
    return ipcRenderer.invoke(IPC.SET_BOX_TRACKER_BOXES, boxIds);
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
  pickSaveFile(): Promise<string | null> {
    return ipcRenderer.invoke(IPC.PICK_SAVE_FILE);
  },
  getDataPaths(): Promise<AppDataPaths> {
    return ipcRenderer.invoke(IPC.GET_DATA_PATHS);
  },
  clearAppData(target: AppDataClearTarget): Promise<ClearAppDataResult> {
    return ipcRenderer.invoke(IPC.CLEAR_APP_DATA, target);
  },
  clearDiagnosticLogs(): Promise<ClearDiagnosticLogResult> {
    return ipcRenderer.invoke(IPC.CLEAR_DIAGNOSTIC_LOGS);
  },
  logRendererError(payload: RendererLogPayload): Promise<void> {
    return ipcRenderer.invoke(IPC.LOG_RENDERER_ERROR, payload);
  },
  getUpdateStatus(): Promise<UpdateStatus> {
    return ipcRenderer.invoke(IPC.GET_UPDATE_STATUS);
  },
  checkForUpdates(): Promise<UpdateStatus> {
    return ipcRenderer.invoke(IPC.UPDATE_CHECK);
  },
  downloadUpdate(): Promise<UpdateStatus> {
    return ipcRenderer.invoke(IPC.UPDATE_DOWNLOAD);
  },
  quitAndInstall(): Promise<void> {
    return ipcRenderer.invoke(IPC.UPDATE_QUIT_AND_INSTALL);
  },
  onUpdateStatus(cb: (status: UpdateStatus) => void): () => void {
    const listener = (_e: unknown, status: UpdateStatus): void => cb(status);
    ipcRenderer.on(IPC.UPDATE_STATUS, listener);
    return () => ipcRenderer.removeListener(IPC.UPDATE_STATUS, listener);
  },
};

contextBridge.exposeInMainWorld("tbh", api);
