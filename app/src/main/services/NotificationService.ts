import { Notification, app } from "electron";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

import {
  notificationSoundFile,
  sanitizeNotificationVolume,
  type NotificationKindId,
  type NotificationSoundId,
} from "../../../shared/notificationCatalog";
import type { AppConfig } from "../../../shared/types";
import { createLogger } from "../log";

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

/** Builds a blocking PowerShell command that plays a WAV via MediaPlayer at volume 0–1. */
export function buildWindowsSoundPlayCommand(path: string, volume: number): string {
  const clamped = Math.min(1, Math.max(0, volume));
  const escaped = path.replace(/'/g, "''");
  return [
    "Add-Type -AssemblyName presentationCore;",
    "$player = New-Object system.windows.media.mediaplayer;",
    `$player.open('${escaped}');`,
    `$player.Volume = ${clamped};`,
    "$player.Play();",
    "Start-Sleep -Milliseconds 500;",
    "while ($player.NaturalDuration.HasTimeSpan -eq $false) { Start-Sleep -Milliseconds 50 }",
    "Start-Sleep -s $player.NaturalDuration.TimeSpan.TotalSeconds;",
  ].join(" ");
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

  previewNotificationSound(soundId: NotificationSoundId): void {
    const config = this.getConfig();
    if (!config.notificationsEnabled) return;
    const volume = sanitizeNotificationVolume(config.notificationVolume) / 100;
    this.playSound(soundId, volume);
  }

  private playKindSound(kind: NotificationKindId): void {
    const config = this.getConfig();
    if (!config.notificationsEnabled) return;
    const pref = config.notificationPrefs[kind];
    if (!pref.enabled) return;
    const volume = sanitizeNotificationVolume(config.notificationVolume) / 100;
    this.playSound(pref.sound, volume);
  }

  private playSound(soundId: NotificationSoundId, volume: number): void {
    if (soundId === "none" || volume <= 0) return;
    const path = resolveSoundPath(soundId);
    if (!path) return;
    if (!existsSync(path)) {
      log.warn(`Notification sound file missing: ${path}`);
      return;
    }
    if (process.platform !== "win32") {
      log.debug(`Notification sound playback skipped on ${process.platform}`);
      return;
    }
    const command = buildWindowsSoundPlayCommand(path, volume);
    execFile("powershell", ["-NoProfile", "-Command", command], { windowsHide: true }, (err) => {
      if (err) log.warn(`Notification sound playback failed: ${err.message}`);
    });
  }
}

export function resolveSoundPath(soundId: NotificationSoundId): string {
  const filename = notificationSoundFile(soundId);
  if (!filename) return "";
  if (app.isPackaged) {
    return join(process.resourcesPath, "sounds", filename);
  }
  return join(app.getAppPath(), "resources", "sounds", filename);
}
