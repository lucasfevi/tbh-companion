import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

type Variant = "default" | "panel" | "card";

export function Accordion({
  title,
  children,
  variant = "default",
  className,
}: {
  title: string;
  children: ReactNode;
  variant?: Variant;
  className?: string;
}) {
  if (variant === "card") {
    return (
      <details className={cn(className)}>
        <summary className="cursor-pointer text-xs font-semibold text-fg">{title}</summary>
        <div className="mt-1.5">{children}</div>
      </details>
    );
  }

  if (variant === "panel") {
    return (
      <details className={cn("overflow-hidden rounded-lg border border-border", className)}>
        <summary className="cursor-pointer list-none bg-panel px-3 py-2.5 text-[13px] font-semibold text-muted hover:bg-card [&::-webkit-details-marker]:hidden">
          {title}
        </summary>
        <div className="flex flex-col gap-3.5 border-t border-border bg-bg/50 px-3 py-3">
          {children}
        </div>
      </details>
    );
  }

  return (
    <details className={cn("flex flex-col gap-3.5", className)}>
      <summary className="cursor-pointer list-none text-[13px] font-semibold text-muted [&::-webkit-details-marker]:hidden">
        {title}
      </summary>
      {children}
    </details>
  );
}
