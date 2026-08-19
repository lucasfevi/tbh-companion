import type { BrowserWindow } from "electron";
import { isAppQuitting } from "../tray/trayService";
import { logWindowCrash, logWindowUnresponsive, createLogger } from "../log";
import { loadRenderer } from "./loadRenderer";

const log = createLogger("window");

/** Guard against reload-crash-reload loops if a renderer keeps dying immediately. */
const RELOAD_LIMIT = 3;
const RELOAD_WINDOW_MS = 60_000;

const CRASH_FALLBACK_HTML = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>TBH Companion</title>
    <style>
      html, body {
        height: 100%;
        margin: 0;
        background: #0f1117;
        color: #e6e6e6;
        font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
      }
      body {
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 24px;
        box-sizing: border-box;
      }
      p { margin: 0.4em 0; }
      .title { font-size: 1.05em; font-weight: 600; }
      .hint { color: #9aa0ab; font-size: 0.9em; }
    </style>
  </head>
  <body>
    <div>
      <p class="title">TBH Companion ran into a repeated problem and couldn't recover.</p>
      <p class="hint">Please close and restart the app.</p>
    </div>
  </body>
</html>`;

/** Load a static, script-free fallback page — no preload/IPC required, so it can't itself crash. */
function showCrashFallback(win: BrowserWindow): void {
  void win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(CRASH_FALLBACK_HTML)}`);
}

/**
 * Recover a window whose renderer process died, instead of leaving a blank,
 * background-colored shell (see docs: webFrameMain send errors on a disposed frame).
 */
export function attachCrashRecovery(win: BrowserWindow, hash: string): void {
  const reloadTimestamps: number[] = [];
  let gaveUp = false;

  win.webContents.on("render-process-gone", (_event, details) => {
    logWindowCrash(hash, details.reason, details.exitCode);

    if (isAppQuitting() || win.isDestroyed()) return;

    const now = Date.now();
    while (reloadTimestamps.length > 0 && now - reloadTimestamps[0] >= RELOAD_WINDOW_MS) {
      reloadTimestamps.shift();
    }
    if (reloadTimestamps.length >= RELOAD_LIMIT) {
      if (!gaveUp) {
        gaveUp = true;
        log.error(
          `[${hash}] auto-reload suppressed after ${RELOAD_LIMIT} crashes within ${RELOAD_WINDOW_MS / 1000}s`,
        );
        showCrashFallback(win);
      }
      return;
    }
    reloadTimestamps.push(now);
    gaveUp = false;

    loadRenderer(win, hash);
  });

  win.webContents.on("unresponsive", () => {
    logWindowUnresponsive(hash);
  });
}
