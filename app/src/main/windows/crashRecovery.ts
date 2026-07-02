import type { BrowserWindow } from "electron";
import { isAppQuitting } from "../tray/trayService";
import { logWindowCrash, logWindowUnresponsive } from "../log";
import { loadRenderer } from "./loadRenderer";

/** Guard against reload-crash-reload loops if a renderer keeps dying immediately. */
const RELOAD_LIMIT = 3;
const RELOAD_WINDOW_MS = 60_000;

/**
 * Recover a window whose renderer process died, instead of leaving a blank,
 * background-colored shell (see docs: webFrameMain send errors on a disposed frame).
 */
export function attachCrashRecovery(win: BrowserWindow, hash: string): void {
  const reloadTimestamps: number[] = [];

  win.webContents.on("render-process-gone", (_event, details) => {
    logWindowCrash(hash, details.reason, details.exitCode);

    if (isAppQuitting() || win.isDestroyed()) return;

    const now = Date.now();
    while (reloadTimestamps.length > 0 && now - reloadTimestamps[0] >= RELOAD_WINDOW_MS) {
      reloadTimestamps.shift();
    }
    if (reloadTimestamps.length >= RELOAD_LIMIT) return;
    reloadTimestamps.push(now);

    loadRenderer(win, hash);
  });

  win.webContents.on("unresponsive", () => {
    logWindowUnresponsive(hash);
  });
}
