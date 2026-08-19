import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

/** Two-column Live layout for the fixed-width main window (900px). */
export function LiveMatchedPair({
  left,
  right,
  className,
}: {
  left: ReactNode;
  right: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <div className="flex w-[calc(50%-7px)] min-w-0 flex-col gap-2.5">{left}</div>
      <div className="absolute top-0 right-0 flex h-full w-[calc(50%-7px)] min-w-0 flex-col">
        {right}
      </div>
    </div>
  );
}
