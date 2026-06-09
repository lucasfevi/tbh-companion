import type { IpcMain } from "electron";
import { IPC } from "../../../../shared/ipc";
import type { AppServices } from "../../app/appState";

export function registerStatsHandlers(ipc: IpcMain, services: AppServices): void {
  ipc.handle(IPC.GET_STATS, () => services.getStats());
  ipc.on(IPC.RESET, () => services.resetTracker());
}
