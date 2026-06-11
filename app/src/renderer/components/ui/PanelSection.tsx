import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function PanelSection({
  title,
  children,
  className,
}: {
  title: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-1", className)}>
      <h2 className="m-0 text-[13px] font-semibold uppercase tracking-wide text-muted">{title}</h2>
      {children}
    </section>
  );
}
