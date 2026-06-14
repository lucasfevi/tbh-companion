import { BrowserWindow } from "electron";
import { appIconImage, setWindowIcon } from "../iconPaths";
import { PRELOAD_SCRIPT } from "../paths";
import { loadRenderer } from "./loadRenderer";
import { applyWindowTopmost } from "./alwaysOnTop";
import {
  BOX_TRACKER_HEIGHT,
  BOX_TRACKER_MIN_HEIGHT,
  BOX_TRACKER_MIN_WIDTH,
  BOX_TRACKER_WIDTH,
} from "./constants";
import {
  applyWindowLayout,
  attachWindowLayoutPersistence,
  type WindowLayoutApplyOptions,
} from "./windowLayout";
import type { WindowLayoutEntry } from "../../../shared/types";

const BOX_TRACKER_LAYOUT_OPTIONS: WindowLayoutApplyOptions = {
  defaults: { width: BOX_TRACKER_WIDTH, height: BOX_TRACKER_HEIGHT },
  constraints: {
    minWidth: BOX_TRACKER_MIN_WIDTH,
    minHeight: BOX_TRACKER_MIN_HEIGHT,
    requireWidth: true,
    requireHeight: true,
  },
  useContentSize: true,
};

export function createBoxTrackerWindow(
  getExisting: () => BrowserWindow | null,
  setWindow: (w: BrowserWindow | null) => void,
  startTopmost: () => boolean,
  onOpen?: () => void,
  onClose?: () => void,
  savedLayout?: WindowLayoutEntry,
  onLayoutChange?: (entry: WindowLayoutEntry) => void,
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
  const icon = appIconImage();
  const win = new BrowserWindow({
    width: BOX_TRACKER_WIDTH,
    height: BOX_TRACKER_HEIGHT,
    useContentSize: true,
    show: false,
    title: "Stage boss chest tracker",
    frame: false,
    resizable: true,
    minWidth: BOX_TRACKER_MIN_WIDTH,
    minHeight: BOX_TRACKER_MIN_HEIGHT,
    alwaysOnTop: topmost,
    backgroundColor: "#0f1117",
    ...(icon.isEmpty() ? {} : { icon }),
    webPreferences: {
      preload: PRELOAD_SCRIPT,
      sandbox: false,
    },
  });

  applyWindowLayout(win, savedLayout, BOX_TRACKER_LAYOUT_OPTIONS);
  if (onLayoutChange) {
    attachWindowLayoutPersistence(win, BOX_TRACKER_LAYOUT_OPTIONS, onLayoutChange);
  }

  applyWindowTopmost(win, topmost, true);
  win.on("ready-to-show", () => win.show());
  win.on("closed", () => {
    setWindow(null);
    onClose?.();
  });

  loadRenderer(win, "box-tracker");
  setWindowIcon(win);
  setWindow(win);
  onOpen?.();
  return win;
}
