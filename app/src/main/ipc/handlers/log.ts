import type { IpcMain } from "electron";
import type { RendererLogPayload } from "../../../../shared/types";
import { IPC } from "../../../../shared/ipc";
import type { AppServices } from "../../app/appState";

export function registerLogHandlers(ipc: IpcMain, services: AppServices): void {
  ipc.handle(IPC.CLEAR_DIAGNOSTIC_LOGS, () => services.clearDiagnosticLogs());
  ipc.handle(IPC.LOG_RENDERER_ERROR, (_e, payload: RendererLogPayload) => {
    services.logRendererError(payload);
  });
}
