import { BrowserWindow } from "electron";
import { PRELOAD_SCRIPT } from "../paths";
import { loadRenderer } from "./loadRenderer";

export function createBoxTrackerWindow(
  getExisting: () => BrowserWindow | null,
  setWindow: (w: BrowserWindow | null) => void,
  onOpen?: () => void,
  onClose?: () => void,
): BrowserWindow {
  const existing = getExisting();
  if (existing && !existing.isDestroyed()) {
    existing.show();
    existing.focus();
    onOpen?.();
    return existing;
  }

  const win = new BrowserWindow({
    width: 340,
    height: 520,
    useContentSize: true,
    show: false,
    frame: false,
    resizable: true,
    minWidth: 300,
    minHeight: 360,
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
    onClose?.();
  });

  loadRenderer(win, "box-tracker");
  setWindow(win);
  onOpen?.();
  return win;
}
