import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function Field({
  label,
  hint,
  checkbox,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  checkbox?: boolean;
  children: ReactNode;
  className?: string;
}) {
  if (checkbox) {
    return (
      <label className={cn("flex flex-row items-center gap-2 text-xs text-muted", className)}>
        {children}
        <span>{label}</span>
      </label>
    );
  }

  return (
    <label className={cn("flex flex-col gap-1 text-xs text-muted", className)}>
      <span>{label}</span>
      {children}
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}
