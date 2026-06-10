import type { IpcMain } from "electron";
import { IPC } from "../../../../shared/ipc";
import type { AppServices } from "../../app/appState";

export function registerWindowHandlers(ipc: IpcMain, services: AppServices): void {
  ipc.on(IPC.OPEN_OVERLAY, () => services.openOverlay());
  ipc.on(IPC.OPEN_BOX_TRACKER, () => services.openBoxTracker());
  ipc.on(IPC.CLOSE_BOX_TRACKER, () => services.closeBoxTracker());
  ipc.on(IPC.SHOW_MAIN, () => services.showMain());
  ipc.on(IPC.CLOSE_OVERLAY, () => services.closeOverlay());
}
