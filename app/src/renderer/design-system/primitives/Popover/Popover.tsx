import type { ReactElement, ReactNode } from "react";
import { Popover as BasePopover } from "@base-ui/react/popover";
import { cn } from "../../lib/variants";

/**
 * Replaces the old hand-rolled AnchoredPanel + clampPanelPosition viewport
 * math with Base UI's Positioner (collision/flip handled internally). Also
 * gains focus-return-to-trigger on close, which AnchoredPanel never had.
 */
export function Popover({
  open,
  onOpenChange,
  trigger,
  children,
  className,
  "aria-label": ariaLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: ReactElement;
  children: ReactNode;
  className?: string;
  /** Required: the popup renders with role="dialog" and needs an accessible
   * name independent of its trigger (axe: aria-dialog-name). */
  "aria-label": string;
}) {
  return (
    <BasePopover.Root open={open} onOpenChange={onOpenChange}>
      <BasePopover.Trigger render={trigger} />
      <BasePopover.Portal>
        <BasePopover.Positioner side="bottom" align="end" sideOffset={4} collisionPadding={8}>
          <BasePopover.Popup
            aria-label={ariaLabel}
            className={cn(
              "min-w-[200px] rounded-md border border-border bg-panel p-2.5 shadow-[0_8px_24px_rgb(0_0_0/0.45)]",
              className,
            )}
          >
            {children}
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
}
