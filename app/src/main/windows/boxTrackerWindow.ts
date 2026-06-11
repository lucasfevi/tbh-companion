import { BrowserWindow } from "electron";
import { PRELOAD_SCRIPT } from "../paths";
import { loadRenderer } from "./loadRenderer";
import { applyWindowTopmost } from "./alwaysOnTop";

export function createBoxTrackerWindow(
  getExisting: () => BrowserWindow | null,
  setWindow: (w: BrowserWindow | null) => void,
  startTopmost: () => boolean,
  onOpen?: () => void,
  onClose?: () => void,
): BrowserWindow {
  const existing = getExisting();
  if (existing && !existing.isDestroyed()) {
    applyWindowTopmost(existing, startTopmost(), true);
    existing.show();
    existing.focus();
    onOpen?.();
    return existing;
  }

  const topmost = startTopmost();
  const win = new BrowserWindow({
    width: 340,
    height: 520,
    useContentSize: true,
    show: false,
    frame: false,
    resizable: true,
    minWidth: 300,
    minHeight: 360,
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
    onClose?.();
  });

  loadRenderer(win, "box-tracker");
  setWindow(win);
  onOpen?.();
  return win;
}
