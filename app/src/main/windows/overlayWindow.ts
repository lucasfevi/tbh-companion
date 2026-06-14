import { BrowserWindow } from "electron";
import type { WindowLayoutEntry, WindowLayoutPrefs } from "../../../shared/types";
import { PRELOAD_SCRIPT } from "../paths";
import { applyWindowTopmost } from "./alwaysOnTop";
import { loadRenderer } from "./loadRenderer";
import {
  applyWindowLayout,
  attachWindowLayoutPersistence,
  type WindowLayoutApplyOptions,
} from "./windowLayout";

/** Mini overlay — keep in sync with `OverlayFrame` (px-2.5 py-1.5) and readout rows. */
export const OVERLAY_WIDTH = 280;
export const OVERLAY_HEIGHT = 94;

const OVERLAY_LAYOUT_OPTIONS: WindowLayoutApplyOptions = {
  defaults: { width: OVERLAY_WIDTH, height: OVERLAY_HEIGHT },
  constraints: {},
  fixedWidth: OVERLAY_WIDTH,
  fixedHeight: OVERLAY_HEIGHT,
  useContentSize: true,
};

export function createOverlayWindow(
  getExisting: () => BrowserWindow | null,
  setWindow: (w: BrowserWindow | null) => void,
  startTopmost: () => boolean,
  onClosed?: () => void,
  savedLayout?: WindowLayoutPrefs["overlay"],
  onLayoutChange?: (entry: WindowLayoutEntry) => void,
): BrowserWindow {
  const existing = getExisting();
  if (existing && !existing.isDestroyed()) {
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

  applyWindowLayout(win, savedLayout, OVERLAY_LAYOUT_OPTIONS);
  if (onLayoutChange) {
    attachWindowLayoutPersistence(win, OVERLAY_LAYOUT_OPTIONS, onLayoutChange);
  }

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
