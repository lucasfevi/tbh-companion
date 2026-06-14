import type { DisplayWorkArea, WindowLayoutEntry } from "../../shared/types";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DisplayLike {
  id: number;
  workArea: DisplayWorkArea;
}

export interface WindowLayoutConstraints {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  requireWidth?: boolean;
  requireHeight?: boolean;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeWorkArea(raw: unknown): DisplayWorkArea | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as DisplayWorkArea;
  if (
    !isFiniteNumber(o.x) ||
    !isFiniteNumber(o.y) ||
    !isFiniteNumber(o.width) ||
    !isFiniteNumber(o.height) ||
    o.width <= 0 ||
    o.height <= 0
  ) {
    return null;
  }
  return {
    x: Math.round(o.x),
    y: Math.round(o.y),
    width: Math.round(o.width),
    height: Math.round(o.height),
  };
}

export function workAreasMatch(a: DisplayWorkArea, b: DisplayWorkArea): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

export function normalizeWindowLayoutEntry(
  raw: unknown,
  constraints: WindowLayoutConstraints,
): WindowLayoutEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as WindowLayoutEntry;
  if (!isFiniteNumber(o.x) || !isFiniteNumber(o.y) || !isFiniteNumber(o.displayId)) return null;

  const displayWorkArea = normalizeWorkArea(o.displayWorkArea);
  if (!displayWorkArea) return null;

  const hasWidth = isFiniteNumber(o.width);
  const hasHeight = isFiniteNumber(o.height);
  if (constraints.requireWidth && !hasWidth) return null;
  if (constraints.requireHeight && !hasHeight) return null;

  let width = hasWidth ? Math.round(o.width!) : undefined;
  let height = hasHeight ? Math.round(o.height!) : undefined;

  if (width !== undefined) {
    if (constraints.minWidth !== undefined) width = Math.max(width, constraints.minWidth);
    if (constraints.maxWidth !== undefined) width = Math.min(width, constraints.maxWidth);
  }
  if (height !== undefined) {
    if (constraints.minHeight !== undefined) height = Math.max(height, constraints.minHeight);
    if (constraints.maxHeight !== undefined) height = Math.min(height, constraints.maxHeight);
  }

  return {
    x: Math.round(o.x),
    y: Math.round(o.y),
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
    displayId: o.displayId,
    displayWorkArea,
  };
}

/** Find the display a saved layout belonged to, or null when the monitor is gone. */
export function resolveDisplayForLayout(
  saved: Pick<WindowLayoutEntry, "displayId" | "displayWorkArea">,
  displays: DisplayLike[],
): DisplayLike | null {
  const byId = displays.find((d) => d.id === saved.displayId);
  if (byId) return byId;

  return displays.find((d) => workAreasMatch(d.workArea, saved.displayWorkArea)) ?? null;
}

/** Shift/size a frame so it fits entirely inside a work area. */
export function clampRectToWorkArea(frame: Rect, workArea: DisplayWorkArea): Rect {
  const width = Math.min(frame.width, workArea.width);
  const height = Math.min(frame.height, workArea.height);

  let x = frame.x;
  let y = frame.y;

  const maxX = workArea.x + workArea.width - width;
  const maxY = workArea.y + workArea.height - height;

  if (x < workArea.x) x = workArea.x;
  if (y < workArea.y) y = workArea.y;
  if (x > maxX) x = Math.max(workArea.x, maxX);
  if (y > maxY) y = Math.max(workArea.y, maxY);

  return { x, y, width, height };
}

/** Convert display-relative layout + frame size to absolute screen bounds. */
export function toAbsoluteBounds(
  entry: WindowLayoutEntry,
  displayWorkArea: DisplayWorkArea,
  frameSize: { width: number; height: number },
): Rect {
  const frame: Rect = {
    x: displayWorkArea.x + entry.x,
    y: displayWorkArea.y + entry.y,
    width: entry.width ?? frameSize.width,
    height: entry.height ?? frameSize.height,
  };
  return clampRectToWorkArea(frame, displayWorkArea);
}

/** Build a persisted entry from absolute frame bounds on a display. */
export function toRelativeLayout(
  frame: Rect,
  display: DisplayLike,
  size?: { width?: number; height?: number },
): WindowLayoutEntry {
  return {
    x: frame.x - display.workArea.x,
    y: frame.y - display.workArea.y,
    ...(size?.width !== undefined ? { width: size.width } : {}),
    ...(size?.height !== undefined ? { height: size.height } : {}),
    displayId: display.id,
    displayWorkArea: { ...display.workArea },
  };
}
