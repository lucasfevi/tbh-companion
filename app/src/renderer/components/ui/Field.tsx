import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function Field({
  label,
  hint,
  checkbox,
  children,
  className,
  title,
}: {
  label: ReactNode;
  hint?: ReactNode;
  checkbox?: boolean;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  if (checkbox) {
    return (
      <label
        className={cn("flex flex-row items-center gap-2 text-xs text-muted", className)}
        title={title}
      >
        {children}
        <span>{label}</span>
      </label>
    );
  }

  return (
    <label className={cn("flex flex-col gap-1 text-xs text-muted", className)} title={title}>
      <span>{label}</span>
      {children}
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}
