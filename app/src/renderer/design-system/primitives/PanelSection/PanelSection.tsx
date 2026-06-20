import type { ReactNode } from "react";
import { cn } from "../../lib/variants";
import { Card } from "../Card/Card";

export function PanelSection({
  title,
  children,
  className,
  boxed = false,
  fill = false,
  contentClassName,
}: {
  title: ReactNode;
  children: ReactNode;
  className?: string;
  /** Wrap content in a panel card (Live lists and chest breakdown). */
  boxed?: boolean;
  /** Card grows to fill a matched-height column (history panels). */
  fill?: boolean;
  contentClassName?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-1", fill && "min-h-0 flex-1", className)}>
      <h2 className="m-0 shrink-0 text-[13px] font-semibold uppercase tracking-wide text-muted">
        {title}
      </h2>
      {boxed ? (
        <Card
          padding="none"
          className={cn("overflow-hidden", fill && "flex min-h-0 flex-1 flex-col")}
        >
          <div className={cn(fill && "flex min-h-0 flex-1 flex-col", contentClassName)}>
            {children}
          </div>
        </Card>
      ) : (
        children
      )}
    </section>
  );
}
