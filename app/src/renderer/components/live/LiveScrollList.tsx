import type { ReactNode } from "react";
import { DataList } from "../ui/DataList";
import { cn } from "../../lib/cn";

/** Scrollable history column body; fills matched-height panel card via flex. */
export function LiveScrollList({
  children,
  empty,
  className,
}: {
  children: ReactNode;
  empty?: ReactNode;
  className?: string;
}) {
  if (empty) {
    return (
      <div
        className={cn("flex min-h-0 flex-1 items-start p-2.5 text-[13px] text-muted", className)}
      >
        {empty}
      </div>
    );
  }

  return (
    <DataList scrollable shell="none" className={cn("min-h-0 flex-1 overflow-y-auto", className)}>
      {children}
    </DataList>
  );
}
