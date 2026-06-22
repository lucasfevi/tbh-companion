import type { ReactNode } from "react";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { cn } from "../../lib/variants";
import { DialogTitle, DialogClose } from "../Dialog/DialogParts";
import { Button } from "../Button/Button";

/**
 * Bottom-anchored sibling of Dialog — same Base UI foundation (focus trap,
 * scroll lock, Escape/backdrop dismiss, focus restoration), but slides up
 * from the bottom instead of fading in centered, and scrolls its own content
 * internally once it hits `max-h`. `title` is required (not just an
 * aria-label) so the popup's implicit role="dialog" always has an accessible
 * name — rendered visually hidden since the sheet's own content usually
 * carries a visible heading already (e.g. the item/box/stage name).
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-bg/80" />
        <BaseDialog.Popup
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 max-h-[70vh] translate-y-0 overflow-y-auto rounded-t-xl border-t border-border bg-panel shadow-2xl transition-transform duration-200 ease-out data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full",
            className,
          )}
        >
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <div className="sticky top-0 flex items-center justify-center bg-panel px-2 pt-2 pb-1">
            <span aria-hidden="true" className="h-1 w-10 rounded-full bg-border" />
            <DialogClose
              render={
                <Button
                  variant="icon"
                  size="sm"
                  className="absolute top-1.5 right-2"
                  aria-label="Close"
                >
                  ✕
                </Button>
              }
            />
          </div>
          <div className="px-4 pb-4">{children}</div>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
