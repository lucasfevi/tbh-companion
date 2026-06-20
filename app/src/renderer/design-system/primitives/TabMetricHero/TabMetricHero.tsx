import type { ReactNode } from "react";
import { Card } from "../Card/Card";
import { cn } from "../../lib/variants";

export function TabMetricHero({
  primary,
  center,
  action,
  className,
}: {
  primary: ReactNode;
  center: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "grid grid-cols-[auto_1fr_auto] items-center gap-x-[18px] gap-y-3.5 max-[560px]:grid-cols-[1fr_auto] max-[560px]:grid-rows-[auto_auto]",
        className,
      )}
    >
      <div className="max-[560px]:col-span-full">{primary}</div>
      <div className="flex min-w-0 flex-col gap-1">{center}</div>
      {action ? <div className="self-center max-[560px]:row-start-2">{action}</div> : null}
    </Card>
  );
}
