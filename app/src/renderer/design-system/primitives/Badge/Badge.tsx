import type { ReactNode } from "react";
import { cn, cva, type VariantProps } from "../../lib/variants";

const badgeVariants = cva("rounded-full px-2 py-0.5 text-[11px]", {
  variants: {
    variant: {
      full: "bg-status-danger font-semibold text-white",
      info: "border border-status-info-border bg-card font-semibold text-status-info",
      success: "border border-status-success-border bg-card font-semibold text-status-success",
      muted: "border border-border bg-card font-medium text-muted",
      statusReady: "bg-status-success/15 font-bold tabular-nums text-status-success",
      statusCooldown: "bg-status-info/15 font-bold tabular-nums text-status-info",
    },
  },
  defaultVariants: { variant: "full" },
});

export function Badge({
  children,
  variant,
  className,
}: { children: ReactNode; className?: string } & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)}>{children}</span>;
}
