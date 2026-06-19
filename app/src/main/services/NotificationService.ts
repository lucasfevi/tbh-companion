import { Notification } from "electron";

import {
  sanitizeNotificationVolume,
  type NotificationKindId,
  type NotificationSoundId,
} from "../../../shared/notificationCatalog";
import type { AppConfig } from "../../../shared/types";
import { createLogger } from "../log";
import { sendNotificationSound } from "./broadcast";

const log = createLogger("notifications");

export interface ChestEventPayload {
  boxId: number;
  name: string;
  level: number | null;
}

export interface HeroLevelUpPayload {
  key: string;
  previousLevel: number;
  newLevel: number;
}

export interface InventoryAlmostFullPayload {
  used: number;
  capacity: number;
}

export class NotificationService {
  private readonly getConfig: () => AppConfig;
  private readonly focusMainWindow: () => void;
  private supported: boolean | null = null;
  private lastNotifiedVersion: string | undefined;

  constructor(getConfig: () => AppConfig, focusMainWindow: () => void) {
    this.getConfig = getConfig;
    this.focusMainWindow = focusMainWindow;
  }

  private isSupported(): boolean {
    if (this.supported !== null) return this.supported;
    this.supported = Notification.isSupported();
    if (!this.supported) log.warn("OS notifications are not supported on this system");
    return this.supported;
  }

  showUpdateAvailable(version: string): void {
    const config = this.getConfig();
    if (!config.notificationsEnabled || !config.notifyOnUpdateAvailable) return;
    if (!this.isSupported()) return;
    if (this.lastNotifiedVersion === version) return;
    this.lastNotifiedVersion = version;

    const notification = new Notification({
      title: "Update available",
      body: `TBH Companion v${version} is available. Open About to download.`,
    });
    notification.on("click", () => this.focusMainWindow());
    notification.show();
  }

  showChestDrop(_payload: ChestEventPayload): void {
    this.playKindSound("chestDrop");
  }

  showChestReady(_payload: ChestEventPayload): void {
    this.playKindSound("chestReady");
  }

  /** Plays once per save poll even when multiple heroes level up together. */
  showHeroLevelUp(events: HeroLevelUpPayload[]): void {
    if (events.length === 0) return;
    this.playKindSound("heroLevelUp");
  }

  showInventoryAlmostFull(_payload: InventoryAlmostFullPayload): void {
    this.playKindSound("inventoryAlmostFull");
  }

  private playKindSound(kind: NotificationKindId): void {
    const config = this.getConfig();
    if (!config.notificationsEnabled) return;
    const pref = config.notificationPrefs[kind];
    if (!pref.enabled) return;
    const volumePercent = sanitizeNotificationVolume(config.notificationVolume);
    this.playSound(pref.sound, volumePercent);
  }

  private playSound(soundId: NotificationSoundId, volumePercent: number): void {
    if (soundId === "none" || volumePercent <= 0) return;
    sendNotificationSound({ soundId, volumePercent });
  }
}
