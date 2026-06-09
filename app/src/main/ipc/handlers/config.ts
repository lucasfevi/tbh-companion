import type { IpcMain } from "electron";
import { IPC } from "../../../../shared/ipc";
import type { AppServices } from "../../app/appState";

export function registerConfigHandlers(ipc: IpcMain, services: AppServices): void {
  ipc.handle(IPC.GET_CONFIG, () => services.getConfig());
  ipc.handle(IPC.SAVE_CONFIG, (_e, patch) => services.saveConfigPatch(patch));
}
