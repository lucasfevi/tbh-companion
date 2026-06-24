import type { IpcMain } from "electron";
import { IPC } from "../../../../shared/ipc";
import type { AppServices } from "../../app/appState";

export function registerInventoryHandlers(ipc: IpcMain, services: AppServices): void {
  ipc.handle(IPC.GET_INVENTORY, () => services.getInventory());
}
