import { BrowserWindow } from "electron";
import { PRELOAD_SCRIPT } from "../paths";
import { isAppQuitting } from "../tray/trayService";
import { loadRenderer } from "./loadRenderer";
import { setWindowIcon } from "../iconPaths";
import { MAIN_WINDOW_HEIGHT, MAIN_WINDOW_MIN_HEIGHT, MAIN_WINDOW_WIDTH } from "./constants";
import { applyWindowTopmost } from "./alwaysOnTop";

export function createMainWindow(
  getExisting: () => BrowserWindow | null,
  setWindow: (w: BrowserWindow | null) => void,
  startTopmost: () => boolean,
): BrowserWindow {
  const existing = getExisting();
  if (existing && !existing.isDestroyed()) {
    existing.setMinimumSize(MAIN_WINDOW_WIDTH, MAIN_WINDOW_MIN_HEIGHT);
    existing.setMaximumSize(MAIN_WINDOW_WIDTH, 0);
    applyWindowTopmost(existing, startTopmost());
    existing.show();
    return existing;
  }

  const win = new BrowserWindow({
    width: MAIN_WINDOW_WIDTH,
    height: MAIN_WINDOW_HEIGHT,
    minWidth: MAIN_WINDOW_WIDTH,
    maxWidth: MAIN_WINDOW_WIDTH,
    minHeight: MAIN_WINDOW_MIN_HEIGHT,
    show: false,
    backgroundColor: "#0f1117",
    autoHideMenuBar: true,
    webPreferences: {
      preload: PRELOAD_SCRIPT,
      sandbox: false,
    },
  });

  win.on("ready-to-show", () => {
    applyWindowTopmost(win, startTopmost());
    win.show();
  });

  win.on("close", (event) => {
    if (!isAppQuitting()) {
      event.preventDefault();
      win.hide();
    }
  });

  win.on("closed", () => setWindow(null));

  loadRenderer(win, "main");
  setWindowIcon(win);
  setWindow(win);
  return win;
}
