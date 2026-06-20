import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/variants";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "rounded-md border border-border bg-card px-2.5 py-1.5 text-[13px] text-fg",
        className,
      )}
      {...props}
    />
  );
}
