import type { ReactNode } from "react";

export function ProgressBar({ percent, label }: { percent: number; label?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="h-2 overflow-hidden rounded border border-border bg-card">
        <div
          className="h-full bg-accent transition-[width] duration-200 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      {label}
    </div>
  );
}
