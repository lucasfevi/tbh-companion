import { BrowserWindow } from "electron";
import { PRELOAD_SCRIPT } from "../paths";
import { isAppQuitting } from "../tray/trayService";
import { loadRenderer } from "./loadRenderer";
import { appIconImage, setWindowIcon } from "../iconPaths";
import { MAIN_WINDOW_HEIGHT, MAIN_WINDOW_MIN_HEIGHT, MAIN_WINDOW_WIDTH } from "./constants";
import { applyWindowTopmost } from "./alwaysOnTop";
import {
  applyWindowLayout,
  attachWindowLayoutPersistence,
  type WindowLayoutApplyOptions,
} from "./windowLayout";
import type { WindowLayoutEntry } from "../../../shared/types";

const MAIN_LAYOUT_OPTIONS: WindowLayoutApplyOptions = {
  defaults: { width: MAIN_WINDOW_WIDTH, height: MAIN_WINDOW_HEIGHT },
  constraints: { minHeight: MAIN_WINDOW_MIN_HEIGHT, requireHeight: true },
  fixedWidth: MAIN_WINDOW_WIDTH,
};

export function createMainWindow(
  getExisting: () => BrowserWindow | null,
  setWindow: (w: BrowserWindow | null) => void,
  startTopmost: () => boolean,
  savedLayout?: WindowLayoutEntry,
  onLayoutChange?: (entry: WindowLayoutEntry) => void,
): BrowserWindow {
  const existing = getExisting();
  if (existing && !existing.isDestroyed()) {
    existing.setMinimumSize(MAIN_WINDOW_WIDTH, MAIN_WINDOW_MIN_HEIGHT);
    existing.setMaximumSize(MAIN_WINDOW_WIDTH, 0);
    applyWindowTopmost(existing, startTopmost());
    existing.show();
    return existing;
  }

  const icon = appIconImage();
  const win = new BrowserWindow({
    width: MAIN_WINDOW_WIDTH,
    height: MAIN_WINDOW_HEIGHT,
    minWidth: MAIN_WINDOW_WIDTH,
    maxWidth: MAIN_WINDOW_WIDTH,
    minHeight: MAIN_WINDOW_MIN_HEIGHT,
    show: false,
    backgroundColor: "#0f1117",
    autoHideMenuBar: true,
    ...(icon.isEmpty() ? {} : { icon }),
    webPreferences: {
      preload: PRELOAD_SCRIPT,
      sandbox: false,
    },
  });

  applyWindowLayout(win, savedLayout, MAIN_LAYOUT_OPTIONS);
  if (onLayoutChange) {
    attachWindowLayoutPersistence(win, MAIN_LAYOUT_OPTIONS, onLayoutChange);
  }

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
