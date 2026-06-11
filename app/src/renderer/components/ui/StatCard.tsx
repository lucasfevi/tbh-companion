import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function StatCard({
  label,
  value,
  valueFirst = false,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  valueFirst?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-lg border border-border bg-panel p-2.5",
        className,
      )}
    >
      {valueFirst ? (
        <>
          <div className="text-lg font-semibold">{value}</div>
          <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
        </>
      ) : (
        <>
          <span className="text-[11px] uppercase tracking-wide text-muted">{label}</span>
          <span className="text-lg font-semibold">{value}</span>
        </>
      )}
    </div>
  );
}
