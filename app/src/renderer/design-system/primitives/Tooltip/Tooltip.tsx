import { cloneElement, useId, type ReactElement, type ReactNode } from "react";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { cn } from "../../lib/variants";

/**
 * Replacement for native `title="..."` attributes — Base UI gives styled,
 * keyboard-dismissible (Escape) tooltips with consistent hover/focus delay,
 * which native `title` can't provide. See DESIGN-SYSTEM.md "Always use
 * Tooltip, never a native title attribute".
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
  underline = false,
}: {
  trigger: ReactElement<{ className?: string }>;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
  /**
   * Marks the trigger as having a tooltip with a dotted underline + help
   * cursor, the way `<abbr>` does — use for plain-text triggers (a label, a
   * value, a timestamp). Skip for triggers that already read as their own
   * UI element (buttons, badges/pills with their own border or background,
   * form controls) — an underline there looks like a broken link rather
   * than "more info on hover".
   */
  underline?: boolean;
}) {
  const popupId = useId();
  const decoratedTrigger = underline
    ? cloneElement(trigger, {
        className: cn(
          trigger.props.className,
          "cursor-help underline decoration-dotted decoration-muted underline-offset-2",
        ),
      })
    : trigger;
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger render={decoratedTrigger} aria-describedby={popupId} />
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
