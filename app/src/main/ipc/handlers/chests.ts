import type { IpcMain } from "electron";
import { IPC } from "../../../../shared/ipc";
import type { AppServices } from "../../app/appState";

export function registerChestHandlers(ipc: IpcMain, services: AppServices): void {
  ipc.handle(IPC.GET_CHESTS, () => services.getChests());
}

export function registerBoxTimerHandlers(ipc: IpcMain, services: AppServices): void {
  ipc.handle(IPC.GET_BOX_TIMERS, () => services.getBoxTimers());
  ipc.handle(IPC.MARK_BOX_DROPPED, (_e, boxId: number) => services.markBoxDropped(boxId));
  ipc.handle(IPC.CLEAR_BOX_TIMER, (_e, boxId: number) => services.clearBoxTimer(boxId));
  ipc.handle(IPC.SET_BOX_TRACKER_BOXES, (_e, boxIds: number[]) =>
    services.setBoxTrackerBoxes(boxIds),
  );
  ipc.handle(IPC.SET_BOX_TRACKER_COOLDOWN, (_e, boxId: number, cooldownSeconds: number) =>
    services.setBoxTrackerCooldown(boxId, cooldownSeconds),
  );
  ipc.handle(IPC.CLEAR_BOX_TRACKER_COOLDOWN, (_e, boxId: number) =>
    services.clearBoxTrackerCooldown(boxId),
  );
  ipc.handle(IPC.SET_BOX_TRACKER_FARM_STAGE, (_e, boxId: number, stageKey: number) =>
    services.setBoxTrackerFarmStage(boxId, stageKey),
  );
  ipc.handle(IPC.CLEAR_BOX_TRACKER_FARM_STAGE, (_e, boxId: number) =>
    services.clearBoxTrackerFarmStage(boxId),
  );
}
