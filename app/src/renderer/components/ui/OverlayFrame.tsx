import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

/** Frameless overlay shell — legacy inset was 6px vertical, 10px horizontal, 4px section gap. */
export function OverlayFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "overlay box-border flex h-full min-h-0 w-full flex-col gap-1 overflow-hidden border border-border bg-bg px-2.5 py-1.5",
        className,
      )}
    >
      {children}
    </div>
  );
}
