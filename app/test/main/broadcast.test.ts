import { describe, it, expect, vi, beforeEach } from "vitest";
import { IPC } from "../../shared/ipc";
import type { NotificationSoundPayload } from "../../shared/types";

const sendMock = vi.fn();
const windows: Array<{
  isDestroyed: () => boolean;
  webContents: { getURL: () => string; send: typeof sendMock };
}> = [];

vi.mock("electron", () => ({
  BrowserWindow: {
    getAllWindows: () => windows,
  },
}));

import { sendNotificationSound } from "../../src/main/services/broadcast";

function addWindow(url: string, destroyed = false) {
  const win = {
    isDestroyed: () => destroyed,
    webContents: { getURL: () => url, send: sendMock },
  };
  windows.push(win);
  return win;
}

const payload: NotificationSoundPayload = { soundId: "soft-chime", volumePercent: 50 };

describe("sendNotificationSound", () => {
  beforeEach(() => {
    windows.length = 0;
    sendMock.mockClear();
  });

  it("targets the main companion window when overlay is also open", () => {
    const main = addWindow("http://localhost:5173/");
    addWindow("http://localhost:5173/#overlay");
    sendNotificationSound(payload);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith(IPC.PLAY_NOTIFICATION_SOUND, payload);
    expect(main.webContents.send).toHaveBeenCalledWith(IPC.PLAY_NOTIFICATION_SOUND, payload);
  });

  it("falls back to the first live window when only auxiliary windows exist", () => {
    const tracker = addWindow("file:///out/renderer/index.html#box-tracker");
    sendNotificationSound(payload);
    expect(tracker.webContents.send).toHaveBeenCalledWith(IPC.PLAY_NOTIFICATION_SOUND, payload);
  });

  it("ignores destroyed windows", () => {
    addWindow("http://localhost:5173/", true);
    addWindow("http://localhost:5173/#overlay");
    const main = addWindow("http://localhost:5173/");
    sendNotificationSound(payload);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(main.webContents.send).toHaveBeenCalledWith(IPC.PLAY_NOTIFICATION_SOUND, payload);
  });

  it("does nothing when no renderer windows are open", () => {
    sendNotificationSound(payload);
    expect(sendMock).not.toHaveBeenCalled();
  });
});
