import type { SelectHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "min-w-[200px] rounded-md border border-border bg-card px-2.5 py-1.5 text-[13px] text-fg",
        className,
      )}
      {...props}
    />
  );
}
