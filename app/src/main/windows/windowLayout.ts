import { screen, type BrowserWindow } from "electron";
import {
  normalizeWindowLayoutEntry,
  resolveDisplayForLayout,
  toAbsoluteBounds,
  toRelativeLayout,
  type DisplayLike,
  type WindowLayoutConstraints,
} from "../../core/windowLayout";
import type { WindowLayoutEntry } from "../../../shared/types";

const PERSIST_DEBOUNCE_MS = 400;

export interface WindowLayoutApplyOptions {
  defaults: { width: number; height: number };
  constraints: WindowLayoutConstraints;
  fixedWidth?: number;
  fixedHeight?: number;
  useContentSize?: boolean;
}

function toDisplayLike(display: Electron.Display): DisplayLike {
  return { id: display.id, workArea: { ...display.workArea } };
}

/** Prefer the saved monitor; if it is unplugged, use primary with the same relative offsets (clamped). */
function resolveTargetDisplay(saved: WindowLayoutEntry): DisplayLike {
  const displays = screen.getAllDisplays().map(toDisplayLike);
  const matched = resolveDisplayForLayout(saved, displays);
  if (matched) return matched;
  return toDisplayLike(screen.getPrimaryDisplay());
}

function normalizeSaved(
  raw: WindowLayoutEntry | undefined,
  constraints: WindowLayoutConstraints,
): WindowLayoutEntry | null {
  if (!raw) return null;
  return normalizeWindowLayoutEntry(raw, constraints);
}

/** Restore saved position (and size where applicable) before the window is shown. */
export function applyWindowLayout(
  win: BrowserWindow,
  saved: WindowLayoutEntry | undefined,
  options: WindowLayoutApplyOptions,
): void {
  const entry = normalizeSaved(saved, options.constraints);
  if (!entry) return;

  const display = resolveTargetDisplay(entry);
  const frameWidth = options.fixedWidth ?? entry.width ?? options.defaults.width;
  const frameHeight = options.fixedHeight ?? entry.height ?? options.defaults.height;

  const bounds = toAbsoluteBounds(entry, display.workArea, {
    width: frameWidth,
    height: frameHeight,
  });

  if (options.useContentSize) {
    win.setContentSize(bounds.width, bounds.height);
    win.setPosition(bounds.x, bounds.y);
    return;
  }

  win.setBounds({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  });
}

function captureLayout(win: BrowserWindow, options: WindowLayoutApplyOptions): WindowLayoutEntry {
  const frame = win.getBounds();
  const display = toDisplayLike(screen.getDisplayMatching(frame));

  if (options.useContentSize) {
    const [width, height] = win.getContentSize();
    if (options.fixedWidth !== undefined && options.fixedHeight !== undefined) {
      return toRelativeLayout(frame, display);
    }
    return toRelativeLayout(frame, display, { width, height });
  }

  if (options.fixedWidth !== undefined) {
    return toRelativeLayout(frame, display, { height: frame.height });
  }

  return toRelativeLayout(frame, display);
}

/** Debounced save on move/resize; flush on close. */
export function attachWindowLayoutPersistence(
  win: BrowserWindow,
  options: WindowLayoutApplyOptions,
  onSave: (entry: WindowLayoutEntry) => void,
): void {
  let timer: NodeJS.Timeout | null = null;

  const flush = (): void => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (win.isDestroyed()) return;
    onSave(captureLayout(win, options));
  };

  const schedule = (): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, PERSIST_DEBOUNCE_MS);
  };

  win.on("resize", schedule);
  win.on("move", schedule);
  win.on("close", flush);
}
