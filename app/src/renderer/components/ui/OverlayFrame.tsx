import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

/** Uniform inset for frameless Mini + box tracker windows (8px all sides). */
export function OverlayFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "overlay box-border flex h-full min-h-0 w-full flex-col gap-2 overflow-hidden border border-border bg-bg p-2",
        className,
      )}
    >
      {children}
    </div>
  );
}
