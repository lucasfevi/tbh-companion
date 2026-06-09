import { BrowserWindow } from "electron";
import { join } from "node:path";
import { loadRenderer } from "./loadRenderer";

export function createMainWindow(
  getExisting: () => BrowserWindow | null,
  setWindow: (w: BrowserWindow | null) => void,
  startTopmost: () => boolean,
): BrowserWindow {
  const existing = getExisting();
  if (existing && !existing.isDestroyed()) {
    existing.show();
    return existing;
  }

  const win = new BrowserWindow({
    width: 900,
    height: 640,
    minWidth: 420,
    minHeight: 480,
    show: false,
    backgroundColor: "#0f1117",
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../../preload/index.js"),
      sandbox: false,
    },
  });

  win.on("ready-to-show", () => {
    win.setAlwaysOnTop(startTopmost());
    win.show();
  });

  win.on("closed", () => setWindow(null));

  loadRenderer(win, "main");
  setWindow(win);
  return win;
}
