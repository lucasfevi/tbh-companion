import { ipcMain } from "electron";
import { IPC } from "../../../shared/ipc";
import type { AppServices } from "../app/appState";

export function registerIpc(services: AppServices): void {
  ipcMain.handle(IPC.GET_STATS, () => services.getStats());

  ipcMain.on(IPC.RESET, () => services.resetTracker());

  ipcMain.on(IPC.OPEN_OVERLAY, () => services.openOverlay());
  ipcMain.on(IPC.SHOW_MAIN, () => services.showMain());
  ipcMain.on(IPC.CLOSE_OVERLAY, () => services.closeOverlay());

  ipcMain.handle(IPC.GET_INVENTORY, () => services.getInventory());

  ipcMain.handle(IPC.GAMEDATA_STATUS, () => services.gameDataStatus());
  ipcMain.handle(IPC.GAMEDATA_REFRESH, () => services.refreshGameData());

  ipcMain.handle(IPC.PRICES_STATUS, () => services.pricesStatus());
  ipcMain.handle(IPC.PRICES_REFRESH, (_e, force?: boolean) => services.refreshPrices(force));
  ipcMain.on(IPC.PRICES_CANCEL, () => services.cancelPrices());
  ipcMain.handle(IPC.SET_CURRENCY, (_e, iso: string) => services.setCurrency(iso));

  ipcMain.handle(IPC.GET_CONFIG, () => services.getConfig());
  ipcMain.handle(IPC.SAVE_CONFIG, (_e, patch) => services.saveConfigPatch(patch));
}
