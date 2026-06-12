import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const notificationCtor = vi.hoisted(() =>
  vi.fn(function MockNotification(this: { show: () => void; on: () => void }) {
    this.show = vi.fn();
    this.on = vi.fn();
  }),
);

const execFileMock = vi.hoisted(() => vi.fn());

vi.mock("electron", () => ({
  Notification: Object.assign(notificationCtor, { isSupported: vi.fn(() => true) }),
  app: {
    isPackaged: false,
    getAppPath: () => "/app",
  },
}));

vi.mock("node:child_process", () => ({
  execFile: execFileMock,
}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn(() => true),
}));

vi.mock("../../src/main/log", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { Notification } from "electron";
import { NotificationService } from "../../src/main/services/NotificationService";
import type { AppConfig } from "../../shared/types";

const baseConfig: AppConfig = {
  savePath: "",
  es3Password: "",
  pollIntervalSeconds: 5,
  rollingWindowMinutes: 5,
  startTopmost: true,
  logHistoryCsv: true,
  currency: "USD",
  notificationsEnabled: true,
  notifyOnUpdateAvailable: true,
  chestSoundVariant: "soft-chime",
};

describe("NotificationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Notification.isSupported).mockReturnValue(true);
    vi.spyOn(process, "platform", "get").mockReturnValue("win32");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("skips update notification when master toggle is off", () => {
    const service = new NotificationService(
      () => ({ ...baseConfig, notificationsEnabled: false }),
      vi.fn(),
    );
    service.showUpdateAvailable("2.0.0");
    expect(notificationCtor).not.toHaveBeenCalled();
  });

  it("skips update notification when update toggle is off", () => {
    const service = new NotificationService(
      () => ({ ...baseConfig, notifyOnUpdateAvailable: false }),
      vi.fn(),
    );
    service.showUpdateAvailable("2.0.0");
    expect(notificationCtor).not.toHaveBeenCalled();
  });

  it("dedupes update notifications per version", () => {
    const service = new NotificationService(() => baseConfig, vi.fn());
    service.showUpdateAvailable("2.0.0");
    service.showUpdateAvailable("2.0.0");
    expect(notificationCtor).toHaveBeenCalledTimes(1);
  });

  it("plays chest sound without showing an OS notification", () => {
    const service = new NotificationService(() => baseConfig, vi.fn());
    service.showChestReady({ boxId: 920151, name: "Test box", level: 15 });
    expect(notificationCtor).not.toHaveBeenCalled();
    expect(execFileMock).toHaveBeenCalledWith(
      "powershell",
      expect.arrayContaining([expect.stringContaining("SoundPlayer")]),
      expect.objectContaining({ windowsHide: true }),
      expect.any(Function),
    );
  });

  it("skips chest sound when master toggle is off", () => {
    const service = new NotificationService(
      () => ({ ...baseConfig, notificationsEnabled: false }),
      vi.fn(),
    );
    service.showChestReady({ boxId: 920151, name: "Test box", level: 15 });
    expect(notificationCtor).not.toHaveBeenCalled();
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it("skips sound when chest variant is none", () => {
    const service = new NotificationService(
      () => ({ ...baseConfig, chestSoundVariant: "none" }),
      vi.fn(),
    );
    service.showChestReady({ boxId: 920151, name: "Test box", level: 15 });
    expect(notificationCtor).not.toHaveBeenCalled();
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it("preview respects master toggle", () => {
    const service = new NotificationService(
      () => ({ ...baseConfig, notificationsEnabled: false }),
      vi.fn(),
    );
    service.previewChestSound();
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it("preview can override the configured chest sound variant", () => {
    const service = new NotificationService(
      () => ({ ...baseConfig, chestSoundVariant: "none" }),
      vi.fn(),
    );
    service.previewChestSound("double-tap");
    expect(execFileMock).toHaveBeenCalledWith(
      "powershell",
      expect.arrayContaining([expect.stringContaining("double-tap.wav")]),
      expect.objectContaining({ windowsHide: true }),
      expect.any(Function),
    );
  });
});
