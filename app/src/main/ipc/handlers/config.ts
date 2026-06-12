import type { IpcMain } from "electron";
import { IPC } from "../../../../shared/ipc";
import type { AppServices } from "../../app/appState";

export function registerConfigHandlers(ipc: IpcMain, services: AppServices): void {
  ipc.handle(IPC.GET_CONFIG, () => services.getConfig());
  ipc.handle(IPC.SAVE_CONFIG, (_e, patch) => services.saveConfigPatch(patch));
  ipc.handle(IPC.PICK_SAVE_FILE, () => services.pickSaveFile());
  ipc.handle(IPC.DISCORD_TEST, (_e, url: string) => services.testDiscordWebhook(url));
}
