import type { ReactNode } from "react";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { cn } from "../../lib/variants";

/**
 * Generic modal chrome (backdrop + centered panel) on top of Base UI's
 * Dialog — gains a real focus trap, scroll lock, and focus restoration to
 * the trigger on close, none of which the old hand-rolled WhatsNewModal had
 * (it only listened for Escape and backdrop mousedown). Consumers compose
 * their own content as children, using `DialogTitle`/`DialogClose` (from
 * `./DialogParts`) for the accessible heading and close affordance.
 */
export function Dialog({
  open,
  onOpenChange,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-bg/80" />
        <BaseDialog.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-panel p-5 shadow-2xl",
            className,
          )}
        >
          {children}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
