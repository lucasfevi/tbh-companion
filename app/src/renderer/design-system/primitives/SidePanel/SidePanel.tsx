import type { ReactNode } from "react";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { cn } from "../../lib/variants";
import { DialogTitle, DialogClose } from "../Dialog/DialogParts";
import { Button } from "../Button/Button";

/**
 * Right-anchored sibling of Dialog — same Base UI foundation (focus trap,
 * scroll lock, Escape/backdrop dismiss, focus restoration), but slides in
 * from the right instead of fading in centered. `title` is required (not just
 * an aria-label) so the popup's implicit role="dialog" always has an
 * accessible name — rendered visually hidden since the panel's own content
 * usually carries a visible heading already (e.g. the item/box/stage name).
 */
export function SidePanel({
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
            "fixed inset-y-0 right-0 z-50 flex h-full w-[25rem] max-w-[calc(100vw-1rem)] translate-x-0 flex-col border-l border-border bg-panel shadow-2xl transition-transform duration-200 ease-out data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full",
            className,
          )}
        >
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <div className="flex h-9 shrink-0 items-center border-b border-border px-2">
            <DialogClose
              render={
                <Button variant="icon" size="sm" aria-label="Close">
                  ✕
                </Button>
              }
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
