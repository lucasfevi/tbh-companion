import type { IpcMain } from "electron";
import { IPC } from "../../../../shared/ipc";
import type { AppServices } from "../../app/appState";

export function registerInventoryHandlers(ipc: IpcMain, services: AppServices): void {
  ipc.handle(IPC.GET_INVENTORY, () => services.getInventory());
  ipc.handle(IPC.GAMEDATA_STATUS, () => services.gameDataStatus());
  ipc.handle(IPC.GAMEDATA_REFRESH, () => services.refreshGameData());
}
