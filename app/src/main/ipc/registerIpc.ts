import { ipcMain } from "electron";
import type { AppServices } from "../app/appState";
import { registerStatsHandlers } from "./handlers/stats";
import { registerInventoryHandlers } from "./handlers/inventory";
import { registerMarketHandlers } from "./handlers/market";
import { registerConfigHandlers } from "./handlers/config";
import { registerWindowHandlers } from "./handlers/window";

export function registerIpc(services: AppServices): void {
  registerStatsHandlers(ipcMain, services);
  registerWindowHandlers(ipcMain, services);
  registerInventoryHandlers(ipcMain, services);
  registerMarketHandlers(ipcMain, services);
  registerConfigHandlers(ipcMain, services);
}
