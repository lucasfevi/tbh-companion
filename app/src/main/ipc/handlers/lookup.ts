import type { IpcMain } from "electron";
import { IPC } from "../../../../shared/ipc";
import type { AppServices } from "../../app/appState";

export function registerLookupHandlers(ipc: IpcMain, services: AppServices): void {
  ipc.handle(IPC.GET_LOOKUP_CATALOG, () => services.getLookupCatalog());
  ipc.handle(IPC.GET_LOOKUP_SOURCES, () => services.getLookupSources());
  ipc.handle(IPC.GET_LOOKUP_SYNTHESIS_MODEL, () => services.getLookupSynthesisModel());
  ipc.handle(IPC.GET_OFFERINGS, () => services.getOfferings());
}
