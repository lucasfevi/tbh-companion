import { BrowserWindow } from "electron";
import { PRELOAD_SCRIPT } from "../paths";
import { loadRenderer } from "./loadRenderer";
import { applyWindowTopmost } from "./alwaysOnTop";

/** Mini overlay — keep in sync with `OverlayFrame` (px-2.5 py-1.5) and readout rows. */
export const OVERLAY_WIDTH = 280;
export const OVERLAY_HEIGHT = 86;

function applyOverlaySize(win: BrowserWindow): void {
  win.setSize(OVERLAY_WIDTH, OVERLAY_HEIGHT);
}

export function createOverlayWindow(
  getExisting: () => BrowserWindow | null,
  setWindow: (w: BrowserWindow | null) => void,
  startTopmost: () => boolean,
  onClosed?: () => void,
): BrowserWindow {
  const existing = getExisting();
  if (existing && !existing.isDestroyed()) {
    applyOverlaySize(existing);
    applyWindowTopmost(existing, startTopmost(), true);
    existing.show();
    existing.focus();
    return existing;
  }

  const topmost = startTopmost();
  const win = new BrowserWindow({
    width: OVERLAY_WIDTH,
    height: OVERLAY_HEIGHT,
    useContentSize: true,
    show: false,
    frame: false,
    resizable: false,
    alwaysOnTop: topmost,
    skipTaskbar: true,
    backgroundColor: "#0f1117",
    webPreferences: {
      preload: PRELOAD_SCRIPT,
      sandbox: false,
    },
  });

  applyWindowTopmost(win, topmost, true);
  win.on("ready-to-show", () => win.show());
  win.on("closed", () => {
    setWindow(null);
    onClosed?.();
  });

  loadRenderer(win, "overlay");
  setWindow(win);
  return win;
}
