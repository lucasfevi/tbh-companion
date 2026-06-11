import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function Badge({
  children,
  variant = "full",
  className,
}: {
  children: ReactNode;
  variant?: "full";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
        variant === "full" && "bg-[#c94a4a] text-white",
        className,
      )}
    >
      {children}
    </span>
  );
}
