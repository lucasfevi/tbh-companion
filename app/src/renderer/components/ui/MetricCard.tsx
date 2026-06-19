import type { ReactNode } from "react";
import { Card } from "./Card";
import { cn } from "../../lib/cn";

/** Headline metric card for side-by-side pairs (label, big value, optional detail line). */
export function MetricCard({
  label,
  value,
  detail,
  title,
  valueClassName,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  title?: string;
  valueClassName?: string;
  className?: string;
}) {
  return (
    <Card className={cn("flex flex-col gap-1", title && "cursor-help", className)} title={title}>
      <span className="text-[12px] tracking-wide text-muted">{label}</span>
      <span className={cn("text-[32px] font-bold leading-none text-accent", valueClassName)}>
        {value}
      </span>
      {detail ? <div className="text-xs text-muted">{detail}</div> : null}
    </Card>
  );
}
