import type { IpcMain } from "electron";
import { IPC } from "../../../../shared/ipc";
import type { AppDataClearTarget } from "../../../../shared/types";
import type { AppServices } from "../../app/appState";

export function registerDataHandlers(ipc: IpcMain, services: AppServices): void {
  ipc.handle(IPC.GET_DATA_PATHS, () => services.getDataPaths());
  ipc.handle(IPC.CLEAR_APP_DATA, (_e, target: AppDataClearTarget) => services.clearAppData(target));
}
