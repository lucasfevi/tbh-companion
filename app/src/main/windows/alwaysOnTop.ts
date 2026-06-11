import type { BrowserWindow } from "electron";

/** Apply user topmost preference. Overlay windows use screen-saver level when enabled. */
export function applyWindowTopmost(win: BrowserWindow, topmost: boolean, overlay = false): void {
  if (topmost && overlay) {
    win.setAlwaysOnTop(true, "screen-saver");
  } else {
    win.setAlwaysOnTop(topmost);
  }
}
