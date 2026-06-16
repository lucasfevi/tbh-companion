import type { ReactNode } from "react";
import { Card } from "./Card";
import { cn } from "../../lib/cn";

export function StatCard({
  label,
  value,
  valueFirst = false,
  valueClassName,
  detail,
  className,
  title,
}: {
  label: ReactNode;
  value: ReactNode;
  valueFirst?: boolean;
  valueClassName?: string;
  detail?: ReactNode;
  className?: string;
  title?: string;
}) {
  const valueNode = (
    <span className={cn("text-lg font-semibold tabular-nums", valueClassName)}>{value}</span>
  );

  return (
    <Card padding="compact" className={cn("flex flex-col gap-1 bg-panel", className)} title={title}>
      {valueFirst ? (
        <>
          {valueNode}
          {detail ? <div className="text-[11px] text-muted">{detail}</div> : null}
          <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
        </>
      ) : (
        <>
          <span className="text-[11px] uppercase tracking-wide text-muted">{label}</span>
          {valueNode}
          {detail ? <div className="text-[11px] text-muted">{detail}</div> : null}
        </>
      )}
    </Card>
  );
}
