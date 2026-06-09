import type { IpcMain } from "electron";
import { IPC } from "../../../../shared/ipc";
import type { AppServices } from "../../app/appState";

export function registerMarketHandlers(ipc: IpcMain, services: AppServices): void {
  ipc.handle(IPC.PRICES_STATUS, () => services.pricesStatus());
  ipc.handle(IPC.PRICES_REFRESH, (_e, force?: boolean) => services.refreshPrices(force));
  ipc.on(IPC.PRICES_CANCEL, () => services.cancelPrices());
  ipc.handle(IPC.SET_CURRENCY, (_e, iso: string) => services.setCurrency(iso));
}
