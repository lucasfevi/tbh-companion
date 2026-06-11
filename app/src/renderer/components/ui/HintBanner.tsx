import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function HintBanner({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-md border border-border border-l-[3px] border-l-gold bg-card px-3 py-2 text-[13px]",
        className,
      )}
    >
      {children}
    </div>
  );
}
