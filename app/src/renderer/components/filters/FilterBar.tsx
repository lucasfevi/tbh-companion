import type { ReactNode } from "react";
import { cn } from "../../design-system/lib/variants";

/**
 * Shared layout for a row of filter controls plus a stable result-count slot.
 * Filter children wrap freely in the left group; `count` lives in its own
 * right-anchored slot so its position never shifts as filters are added,
 * removed, or shown/hidden.
 */
export function FilterBar({
  children,
  count,
  className,
}: {
  children: ReactNode;
  count?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <div className="flex flex-1 flex-wrap items-end gap-3">{children}</div>
      {count != null ? (
        <div className="shrink-0 whitespace-nowrap text-xs text-muted">{count}</div>
      ) : null}
    </div>
  );
}
