import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

export function DataList({
  children,
  className,
  scrollable = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { scrollable?: boolean }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border",
        scrollable && "overflow-y-auto",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function DataListRow({
  index,
  children,
  className,
}: {
  index: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-3 py-2 text-[13px]", index % 2 === 0 && "bg-panel", className)}>
      {children}
    </div>
  );
}
