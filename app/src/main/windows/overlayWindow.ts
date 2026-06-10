import { BrowserWindow } from "electron";
import { PRELOAD_SCRIPT } from "../paths";
import { loadRenderer } from "./loadRenderer";

export function createOverlayWindow(
  getExisting: () => BrowserWindow | null,
  setWindow: (w: BrowserWindow | null) => void,
  onClosed?: () => void,
): BrowserWindow {
  const existing = getExisting();
  if (existing && !existing.isDestroyed()) {
    existing.show();
    existing.focus();
    return existing;
  }

  const win = new BrowserWindow({
    width: 280,
    height: 200,
    show: false,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: "#0f1117",
    webPreferences: {
      preload: PRELOAD_SCRIPT,
      sandbox: false,
    },
  });

  win.setAlwaysOnTop(true, "screen-saver");
  win.on("ready-to-show", () => win.show());
  win.on("closed", () => {
    setWindow(null);
    onClosed?.();
  });

  loadRenderer(win, "overlay");
  setWindow(win);
  return win;
}
