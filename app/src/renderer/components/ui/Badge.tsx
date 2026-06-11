import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

type Variant = "full" | "info" | "success" | "muted" | "statusReady" | "statusCooldown";

const variantClasses: Record<Variant, string> = {
  full: "bg-status-danger font-semibold text-white",
  info: "border border-status-info-border bg-card font-semibold text-status-info",
  success: "border border-status-success-border bg-card font-semibold text-status-success",
  muted: "border border-border bg-card font-medium text-muted",
  statusReady: "bg-status-success/15 font-bold tabular-nums text-status-success",
  statusCooldown: "bg-status-info/15 font-bold tabular-nums text-status-info",
};

export function Badge({
  children,
  variant = "full",
  className,
}: {
  children: ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <span
      className={cn("rounded-full px-2 py-0.5 text-[11px]", variantClasses[variant], className)}
    >
      {children}
    </span>
  );
}
