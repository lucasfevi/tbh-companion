import { ipcMain } from "electron";
import type { AppServices } from "../app/appState";
import { registerStatsHandlers } from "./handlers/stats";
import { registerInventoryHandlers } from "./handlers/inventory";
import { registerMarketHandlers } from "./handlers/market";
import { registerConfigHandlers } from "./handlers/config";
import { registerDataHandlers } from "./handlers/data";
import { registerLogHandlers } from "./handlers/log";
import { registerWindowHandlers } from "./handlers/window";
import { registerChestHandlers, registerBoxTimerHandlers } from "./handlers/chests";
import { registerNotificationHandlers } from "./handlers/notifications";
import { registerPetHandlers } from "./handlers/pets";
import { registerUpdateHandlers } from "./handlers/update";

export function registerIpc(services: AppServices): void {
  registerStatsHandlers(ipcMain, services);
  registerWindowHandlers(ipcMain, services);
  registerInventoryHandlers(ipcMain, services);
  registerChestHandlers(ipcMain, services);
  registerPetHandlers(ipcMain, services);
  registerBoxTimerHandlers(ipcMain, services);
  registerMarketHandlers(ipcMain, services);
  registerConfigHandlers(ipcMain, services);
  registerDataHandlers(ipcMain, services);
  registerLogHandlers(ipcMain, services);
  registerUpdateHandlers(ipcMain, services);
  registerNotificationHandlers(ipcMain, services);
}
