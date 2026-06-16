import type { CSSProperties } from "react";

const VIEWPORT_PAD = 8;

export function clampPanelPosition(
  trigger: Pick<DOMRect, "top" | "right" | "bottom">,
  panelW: number,
  panelH: number,
  viewportW: number,
  viewportH: number,
): Pick<CSSProperties, "left" | "top"> {
  let left = trigger.right - panelW;
  left = Math.max(VIEWPORT_PAD, Math.min(left, viewportW - panelW - VIEWPORT_PAD));

  let top = trigger.bottom + 4;
  if (top + panelH > viewportH - VIEWPORT_PAD) {
    top = Math.max(VIEWPORT_PAD, trigger.top - panelH - 4);
  }

  return { left, top };
}
