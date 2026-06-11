import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function Accordion({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details className={cn("flex flex-col gap-3.5", className)}>
      <summary className="cursor-pointer list-none text-[13px] font-semibold text-muted [&::-webkit-details-marker]:hidden">
        {title}
      </summary>
      {children}
    </details>
  );
}
