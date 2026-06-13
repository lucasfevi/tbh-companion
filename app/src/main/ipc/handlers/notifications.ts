import type { NotificationSoundId } from "../../../../shared/notificationCatalog";
import { IPC } from "../../../../shared/ipc";
import type { IpcMain } from "electron";

export interface NotificationIpcServices {
  previewNotificationSound: (soundId: NotificationSoundId) => void;
}

export function registerNotificationHandlers(
  ipc: IpcMain,
  services: NotificationIpcServices,
): void {
  ipc.handle(IPC.PREVIEW_NOTIFICATION_SOUND, (_e, soundId: NotificationSoundId) => {
    services.previewNotificationSound(soundId);
  });
}
