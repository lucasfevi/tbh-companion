import type { ReactNode } from "react";
import { DataList } from "../../design-system/primitives/DataList/DataList";
import { cn } from "../../lib/cn";

/**
 * Fixed-height scrollable list body (~4-5 rows at the current row size), so a
 * short list is just short (no huge near-empty box) and a long list scrolls
 * within a predictable frame, independent of any matched-column height.
 */
const FIXED_HEIGHT = "max-h-[168px]";

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
    return <div className={cn("items-start p-2.5 text-[13px] text-muted", className)}>{empty}</div>;
  }

  return (
    <DataList scrollable shell="none" className={cn(FIXED_HEIGHT, "overflow-y-auto", className)}>
      {children}
    </DataList>
  );
}
