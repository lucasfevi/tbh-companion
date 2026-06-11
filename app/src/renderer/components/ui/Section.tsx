import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-1", className)}>
      <h2 className="m-0 text-sm font-semibold text-fg">{title}</h2>
      {children}
    </section>
  );
}
