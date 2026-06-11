import type { IpcMain } from "electron";
import { IPC } from "../../../../shared/ipc";
import type { AppServices } from "../../app/appState";

export function registerPetHandlers(ipc: IpcMain, services: AppServices): void {
  ipc.handle(IPC.GET_PETS, () => services.getPets());
}
