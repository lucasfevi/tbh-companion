import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

/**
 * Two-column Live layout for the fixed-width main window (900px). Plain grid
 * columns, each sized to its own content — NOT height-matched. A previous
 * absolute-positioned version sized the row height from `left` only, so a
 * taller `right` column would visually overlap whatever rendered next; this
 * version can never overlap regardless of which side is taller.
 */
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
    <div className={cn("grid grid-cols-2 items-start gap-3.5", className)}>
      <div className="flex min-w-0 flex-col gap-2.5">{left}</div>
      <div className="flex min-w-0 flex-col gap-2.5">{right}</div>
    </div>
  );
}
