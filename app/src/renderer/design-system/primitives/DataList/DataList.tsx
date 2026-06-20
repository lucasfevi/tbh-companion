import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/variants";

export function DataList({
  children,
  className,
  scrollable = false,
  shell = "border",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  scrollable?: boolean;
  /** Border frame when the list stands alone; use `none` inside `PanelSection boxed`. */
  shell?: "border" | "none";
}) {
  return (
    <div
      className={cn(
        "overflow-hidden",
        shell === "border" && "rounded-lg border border-border",
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
