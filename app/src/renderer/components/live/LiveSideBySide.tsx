import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function LiveSideBySide({
  left,
  right,
  className,
}: {
  left: ReactNode;
  right: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 items-start gap-3.5 min-[720px]:grid-cols-2", className)}>
      <div className="min-w-0">{left}</div>
      <div className="min-w-0">{right}</div>
    </div>
  );
}
