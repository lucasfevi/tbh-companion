import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DEFAULT_NOTIFICATION_PREFS } from "../../shared/notificationCatalog";
import { IPC } from "../../shared/ipc";

const notificationCtor = vi.hoisted(() =>
  vi.fn(function MockNotification(this: { show: () => void; on: () => void }) {
    this.show = vi.fn();
    this.on = vi.fn();
  }),
);

const sendNotificationSoundMock = vi.hoisted(() => vi.fn());

vi.mock("electron", () => ({
  Notification: Object.assign(notificationCtor, { isSupported: vi.fn(() => true) }),
}));

vi.mock("../../src/main/services/broadcast", () => ({
  sendNotificationSound: sendNotificationSoundMock,
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
  notificationVolume: 100,
  notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
  inventoryAlmostFullThresholdPercent: 90,
  chestAutoOpenEnabled: { common: false, stageBoss: false, actBoss: false },
};

describe("NotificationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Notification.isSupported).mockReturnValue(true);
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

  it("plays chest ready sound via renderer IPC", () => {
    const service = new NotificationService(() => baseConfig, vi.fn());
    service.showChestReady({ boxId: 920151, name: "Test box", level: 15 });
    expect(sendNotificationSoundMock).toHaveBeenCalledWith({
      soundId: "soft-chime",
      volumePercent: 100,
    });
  });

  it("plays chest drop sound for chestDrop kind", () => {
    const service = new NotificationService(() => baseConfig, vi.fn());
    service.showChestDrop({ boxId: 920151, name: "Test box", level: 15 });
    expect(sendNotificationSoundMock).toHaveBeenCalledWith({
      soundId: "treasure-fanfare",
      volumePercent: 100,
    });
  });

  it("plays hero level up sound for heroLevelUp kind", () => {
    const service = new NotificationService(() => baseConfig, vi.fn());
    service.showHeroLevelUp([{ key: "101", previousLevel: 5, newLevel: 6 }]);
    expect(sendNotificationSoundMock).toHaveBeenCalledWith({
      soundId: "level-triumph",
      volumePercent: 100,
    });
  });

  it("plays inventory almost full sound for inventoryAlmostFull kind", () => {
    const service = new NotificationService(() => baseConfig, vi.fn());
    service.showInventoryAlmostFull({ used: 90, capacity: 100 });
    expect(sendNotificationSoundMock).toHaveBeenCalledWith({
      soundId: "happy-ping",
      volumePercent: 100,
    });
  });

  it("plays hero level up sound once for a batch of level-ups", () => {
    const service = new NotificationService(() => baseConfig, vi.fn());
    service.showHeroLevelUp([
      { key: "101", previousLevel: 5, newLevel: 6 },
      { key: "201", previousLevel: 2, newLevel: 3 },
    ]);
    expect(sendNotificationSoundMock).toHaveBeenCalledTimes(1);
  });

  it("skips hero level up sound for an empty batch", () => {
    const service = new NotificationService(() => baseConfig, vi.fn());
    service.showHeroLevelUp([]);
    expect(sendNotificationSoundMock).not.toHaveBeenCalled();
  });

  it("skips kind sound when master toggle is off", () => {
    const service = new NotificationService(
      () => ({ ...baseConfig, notificationsEnabled: false }),
      vi.fn(),
    );
    service.showChestReady({ boxId: 920151, name: "Test box", level: 15 });
    expect(sendNotificationSoundMock).not.toHaveBeenCalled();
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
    expect(sendNotificationSoundMock).not.toHaveBeenCalled();
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
    expect(sendNotificationSoundMock).not.toHaveBeenCalled();
  });

  it("skips sound when notification volume is zero", () => {
    const service = new NotificationService(
      () => ({ ...baseConfig, notificationVolume: 0 }),
      vi.fn(),
    );
    service.showChestReady({ boxId: 920151, name: "Test box", level: 15 });
    expect(sendNotificationSoundMock).not.toHaveBeenCalled();
  });

  it("passes scaled volume percent when below 100", () => {
    const service = new NotificationService(
      () => ({ ...baseConfig, notificationVolume: 25 }),
      vi.fn(),
    );
    service.showChestReady({ boxId: 920151, name: "Test box", level: 15 });
    expect(sendNotificationSoundMock).toHaveBeenCalledWith({
      soundId: "soft-chime",
      volumePercent: 25,
    });
  });

  it("defaults volume when notificationVolume is missing from config", () => {
    const service = new NotificationService(
      () => ({ ...baseConfig, notificationVolume: undefined as unknown as number }),
      vi.fn(),
    );
    service.showChestReady({ boxId: 920151, name: "Test box", level: 15 });
    expect(sendNotificationSoundMock).toHaveBeenCalledWith({
      soundId: "soft-chime",
      volumePercent: 100,
    });
  });
});

describe("sendNotificationSound IPC channel", () => {
  it("uses the play-notification-sound push channel", () => {
    expect(IPC.PLAY_NOTIFICATION_SOUND).toBe("play-notification-sound");
  });
});
