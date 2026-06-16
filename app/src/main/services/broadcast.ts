import { BrowserWindow } from "electron";

import { IPC } from "../../../shared/ipc";
import type { NotificationSoundPayload } from "../../../shared/types";

/** Send a channel payload to every live renderer window. */
export function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, payload);
  }
}

function isAuxiliaryRenderer(win: BrowserWindow): boolean {
  try {
    const hash = new URL(win.webContents.getURL()).hash;
    return hash === "#overlay" || hash === "#box-tracker";
  } catch {
    return false;
  }
}

/** Play alert audio in one renderer (main companion window when available). */
export function sendNotificationSound(payload: NotificationSoundPayload): void {
  const live = BrowserWindow.getAllWindows().filter((w) => !w.isDestroyed());
  const target = live.find((w) => !isAuxiliaryRenderer(w)) ?? live[0];
  target?.webContents.send(IPC.PLAY_NOTIFICATION_SOUND, payload);
}
