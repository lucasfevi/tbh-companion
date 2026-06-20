import { useId, type ReactElement, type ReactNode } from "react";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { cn } from "../../lib/variants";

/**
 * Forward-looking replacement for native `title="..."` attributes (e.g.
 * Overlay.tsx's RATE_TIP/GOLD_TIP) — not wired into the app yet. Base UI
 * gives styled, keyboard-dismissible (Escape) tooltips with consistent
 * hover/focus delay, which native `title` can't provide.
 *
 * Base UI 1.6's Tooltip doesn't assign `role="tooltip"`/`aria-describedby`
 * itself (unlike Popover, which assigns `role="dialog"` internally) — wired
 * manually here to match the WAI-ARIA tooltip pattern.
 */
export function Tooltip({
  trigger,
  children,
  side = "top",
  className,
}: {
  trigger: ReactElement;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}) {
  const popupId = useId();
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger render={trigger} aria-describedby={popupId} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner side={side} sideOffset={6} className="z-50">
          <BaseTooltip.Popup
            id={popupId}
            role="tooltip"
            className={cn(
              "rounded-md border border-border bg-panel px-2.5 py-1.5 text-xs text-fg shadow-[0_8px_24px_rgb(0_0_0/0.45)]",
              className,
            )}
          >
            {children}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}
