import { app } from "electron";
import { autoUpdater } from "electron-updater";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { IPC } from "../../../shared/ipc";
import type { UpdatePhase, UpdateStatus } from "../../../shared/types";
import { createLogger } from "../log";
import { setAppQuitting } from "../tray/trayService";
import { broadcast } from "./broadcast";

const updateLog = createLogger("updater");

const BACKGROUND_CHECK_DELAY_MS = 30_000;

function readAppVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, "../../package.json"), "utf-8")) as {
      version?: string;
    };
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

function formatCurrentVersion(): string {
  const base = readAppVersion();
  return app.isPackaged ? base : `${base}-dev`;
}

function friendlyUpdateError(err: unknown): string {
  const message =
    err instanceof Error ? err.message : typeof err === "string" ? err : "Update check failed.";
  const lower = message.toLowerCase();

  if (
    lower.includes("net::") ||
    lower.includes("enotfound") ||
    lower.includes("econnrefused") ||
    lower.includes("network") ||
    lower.includes("offline") ||
    lower.includes("getaddrinfo")
  ) {
    return "Could not reach GitHub. Check your internet connection and try again.";
  }
  if (lower.includes("403") || lower.includes("rate limit") || lower.includes("429")) {
    return "GitHub rate limit reached. Wait a few minutes and try again.";
  }
  if (lower.includes("404") || lower.includes("no published versions")) {
    return "No release found for this app yet.";
  }
  return message;
}

export class UpdateService {
  private status: UpdateStatus;
  private started = false;
  private backgroundTimer: ReturnType<typeof setTimeout> | null = null;
  private checkInFlight = false;
  private downloadInFlight = false;

  constructor() {
    this.status = this.baseStatus();
  }

  private baseStatus(phase: UpdatePhase = "idle"): UpdateStatus {
    return {
      phase: app.isPackaged ? phase : "disabled",
      currentVersion: formatCurrentVersion(),
    };
  }

  private setStatus(patch: Partial<UpdateStatus>): UpdateStatus {
    this.status = { ...this.status, ...patch };
    broadcast(IPC.UPDATE_STATUS, this.status);
    return this.status;
  }

  getStatus(): UpdateStatus {
    return { ...this.status };
  }

  start(): void {
    if (this.started) return;
    this.started = true;

    if (!app.isPackaged) {
      this.setStatus(this.baseStatus("disabled"));
      updateLog.info("Updater disabled in development");
      return;
    }

    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.logger = updateLog;

    autoUpdater.on("checking-for-update", () => {
      this.setStatus({ phase: "checking", error: undefined });
    });

    autoUpdater.on("update-available", (info) => {
      this.checkInFlight = false;
      this.setStatus({
        phase: "available",
        availableVersion: info.version,
        error: undefined,
        lastCheckedAt: new Date().toISOString(),
      });
      updateLog.info(`Update available: v${info.version}`);
    });

    autoUpdater.on("update-not-available", () => {
      this.checkInFlight = false;
      this.setStatus({
        phase: "not-available",
        availableVersion: undefined,
        error: undefined,
        lastCheckedAt: new Date().toISOString(),
      });
      updateLog.info("App is up to date");
    });

    autoUpdater.on("download-progress", (progress) => {
      this.setStatus({
        phase: "downloading",
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total,
        error: undefined,
      });
    });

    autoUpdater.on("update-downloaded", (info) => {
      this.downloadInFlight = false;
      this.setStatus({
        phase: "ready",
        availableVersion: info.version,
        percent: 100,
        error: undefined,
      });
      updateLog.info(`Update downloaded: v${info.version}`);
    });

    autoUpdater.on("error", (err) => {
      this.checkInFlight = false;
      this.downloadInFlight = false;
      const error = friendlyUpdateError(err);
      updateLog.warn(`Update error: ${error}`);
      this.setStatus({
        phase: "error",
        error,
        lastCheckedAt: new Date().toISOString(),
      });
    });

    this.setStatus(this.baseStatus("idle"));

    this.backgroundTimer = setTimeout(() => {
      void this.checkForUpdates();
    }, BACKGROUND_CHECK_DELAY_MS);
  }

  async checkForUpdates(): Promise<UpdateStatus> {
    if (!app.isPackaged) {
      return this.getStatus();
    }
    if (this.checkInFlight || this.downloadInFlight || this.status.phase === "downloading") {
      return this.getStatus();
    }
    if (this.status.phase === "ready") {
      return this.getStatus();
    }

    this.checkInFlight = true;
    try {
      await autoUpdater.checkForUpdates();
    } catch (err) {
      const error = friendlyUpdateError(err);
      updateLog.warn(`Update check failed: ${error}`);
      return this.setStatus({
        phase: "error",
        error,
        lastCheckedAt: new Date().toISOString(),
      });
    } finally {
      this.checkInFlight = false;
    }
    return this.getStatus();
  }

  async downloadUpdate(): Promise<UpdateStatus> {
    if (!app.isPackaged) {
      return this.getStatus();
    }
    if (this.status.phase !== "available" || this.downloadInFlight) {
      return this.getStatus();
    }

    this.downloadInFlight = true;
    this.setStatus({ phase: "downloading", percent: 0, error: undefined });
    try {
      await autoUpdater.downloadUpdate();
    } catch (err) {
      this.downloadInFlight = false;
      const error = friendlyUpdateError(err);
      updateLog.warn(`Update download failed: ${error}`);
      return this.setStatus({
        phase: "error",
        error,
      });
    }
    return this.getStatus();
  }

  quitAndInstall(): void {
    if (!app.isPackaged || this.status.phase !== "ready") return;
    setAppQuitting(true);
    autoUpdater.quitAndInstall();
  }

  stop(): void {
    if (this.backgroundTimer) {
      clearTimeout(this.backgroundTimer);
      this.backgroundTimer = null;
    }
  }
}
