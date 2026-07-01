import { fmtCompact } from "./format";
import { cn } from "./cn";

export function LiveChestStatValue({
  total,
  perHour,
  countClassName,
  inactive = false,
}: {
  total: number;
  perHour: number;
  countClassName?: string;
  /** Muted when live chest tracking is inactive (reader off or detection unavailable). */
  inactive?: boolean;
}) {
  return (
    <>
      <span className={cn(countClassName, inactive && "text-muted")}>{total.toLocaleString()}</span>
      <span className="text-base font-normal text-muted"> ({fmtCompact(perHour)}/hr)</span>
    </>
  );
}
