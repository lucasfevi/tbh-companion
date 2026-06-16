import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DEFAULT_NOTIFICATION_PREFS } from "../../shared/notificationCatalog";

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
import {
  buildWindowsSoundPlayCommand,
  NotificationService,
} from "../../src/main/services/NotificationService";
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
  notificationVolume: 100,
  notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
};

function expectMediaPlayerPlay(volume: number): void {
  expect(execFileMock).toHaveBeenCalledWith(
    "powershell",
    expect.arrayContaining([
      expect.stringContaining("mediaplayer"),
      expect.stringContaining(`$player.Volume = ${volume}`),
    ]),
    expect.objectContaining({ windowsHide: true }),
    expect.any(Function),
  );
}

describe("buildWindowsSoundPlayCommand", () => {
  it("escapes single quotes in the path and clamps volume", () => {
    const command = buildWindowsSoundPlayCommand("C:\\sounds\\it's.wav", 1.5);
    expect(command).toContain("it''s.wav");
    expect(command).toContain("$player.Volume = 1");
  });
});

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

  it("plays chest ready sound without showing an OS notification", () => {
    const service = new NotificationService(() => baseConfig, vi.fn());
    service.showChestReady({ boxId: 920151, name: "Test box", level: 15 });
    expect(notificationCtor).not.toHaveBeenCalled();
    expect(execFileMock).toHaveBeenCalledWith(
      "powershell",
      expect.arrayContaining([expect.stringContaining("soft-chime.wav")]),
      expect.objectContaining({ windowsHide: true }),
      expect.any(Function),
    );
    expectMediaPlayerPlay(1);
  });

  it("plays chest drop sound for chestDrop kind", () => {
    const service = new NotificationService(() => baseConfig, vi.fn());
    service.showChestDrop({ boxId: 920151, name: "Test box", level: 15 });
    expect(execFileMock).toHaveBeenCalledWith(
      "powershell",
      expect.arrayContaining([expect.stringContaining("treasure-fanfare.wav")]),
      expect.objectContaining({ windowsHide: true }),
      expect.any(Function),
    );
  });

  it("plays hero level up sound for heroLevelUp kind", () => {
    const service = new NotificationService(() => baseConfig, vi.fn());
    service.showHeroLevelUp([{ key: "101", previousLevel: 5, newLevel: 6 }]);
    expect(execFileMock).toHaveBeenCalledWith(
      "powershell",
      expect.arrayContaining([expect.stringContaining("level-triumph.wav")]),
      expect.objectContaining({ windowsHide: true }),
      expect.any(Function),
    );
  });

  it("plays hero level up sound once for a batch of level-ups", () => {
    const service = new NotificationService(() => baseConfig, vi.fn());
    service.showHeroLevelUp([
      { key: "101", previousLevel: 5, newLevel: 6 },
      { key: "201", previousLevel: 2, newLevel: 3 },
    ]);
    expect(execFileMock).toHaveBeenCalledTimes(1);
  });

  it("skips hero level up sound for an empty batch", () => {
    const service = new NotificationService(() => baseConfig, vi.fn());
    service.showHeroLevelUp([]);
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it("skips kind sound when master toggle is off", () => {
    const service = new NotificationService(
      () => ({ ...baseConfig, notificationsEnabled: false }),
      vi.fn(),
    );
    service.showChestReady({ boxId: 920151, name: "Test box", level: 15 });
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it("skips kind sound when kind is disabled", () => {
    const service = new NotificationService(
      () => ({
        ...baseConfig,
        notificationPrefs: {
          ...baseConfig.notificationPrefs,
          chestReady: { enabled: false, sound: "soft-chime" },
        },
      }),
      vi.fn(),
    );
    service.showChestReady({ boxId: 920151, name: "Test box", level: 15 });
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it("skips sound when kind sound is none", () => {
    const service = new NotificationService(
      () => ({
        ...baseConfig,
        notificationPrefs: {
          ...baseConfig.notificationPrefs,
          chestReady: { enabled: true, sound: "none" },
        },
      }),
      vi.fn(),
    );
    service.showChestReady({ boxId: 920151, name: "Test box", level: 15 });
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it("skips sound when notification volume is zero", () => {
    const service = new NotificationService(
      () => ({ ...baseConfig, notificationVolume: 0 }),
      vi.fn(),
    );
    service.showChestReady({ boxId: 920151, name: "Test box", level: 15 });
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it("plays at scaled volume when notification volume is below 100", () => {
    const service = new NotificationService(
      () => ({ ...baseConfig, notificationVolume: 50 }),
      vi.fn(),
    );
    service.showChestReady({ boxId: 920151, name: "Test box", level: 15 });
    expectMediaPlayerPlay(0.5);
  });

  it("defaults volume when notificationVolume is missing from config", () => {
    const service = new NotificationService(
      () => ({ ...baseConfig, notificationVolume: undefined as unknown as number }),
      vi.fn(),
    );
    service.showChestReady({ boxId: 920151, name: "Test box", level: 15 });
    expectMediaPlayerPlay(1);
  });

  it("preview respects master toggle", () => {
    const service = new NotificationService(
      () => ({ ...baseConfig, notificationsEnabled: false }),
      vi.fn(),
    );
    service.previewNotificationSound("double-tap");
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it("preview plays the requested sound id", () => {
    const service = new NotificationService(() => baseConfig, vi.fn());
    service.previewNotificationSound("double-tap");
    expect(execFileMock).toHaveBeenCalledWith(
      "powershell",
      expect.arrayContaining([expect.stringContaining("double-tap.wav")]),
      expect.objectContaining({ windowsHide: true }),
      expect.any(Function),
    );
  });
});
