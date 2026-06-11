import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

const fillClasses = {
  gray: "bg-status-muted",
  blue: "bg-status-info",
  red: "bg-status-danger",
} as const;

export function CapacityBar({
  percent,
  variant,
  compact = false,
  className,
  ...props
}: {
  percent: number;
  variant: keyof typeof fillClasses;
  compact?: boolean;
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-full bg-panel",
        compact ? "my-1.5 h-1.5" : "h-2.5",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-300 ease-out",
          fillClasses[variant],
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
