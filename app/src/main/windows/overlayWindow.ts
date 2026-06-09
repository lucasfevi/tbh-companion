import { BrowserWindow } from "electron";
import { join } from "node:path";
import { loadRenderer } from "./loadRenderer";

export function createOverlayWindow(
  getExisting: () => BrowserWindow | null,
  setWindow: (w: BrowserWindow | null) => void,
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
      preload: join(__dirname, "../../preload/index.js"),
      sandbox: false,
    },
  });

  win.setAlwaysOnTop(true, "screen-saver");
  win.on("ready-to-show", () => win.show());
  win.on("closed", () => setWindow(null));

  loadRenderer(win, "overlay");
  setWindow(win);
  return win;
}
