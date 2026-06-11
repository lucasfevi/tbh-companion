import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type Variant = "default" | "primary" | "danger" | "ghost" | "success";
type Size = "default" | "lg" | "sm";

const variantClasses: Record<Variant, string> = {
  default: "bg-card border-border text-fg hover:border-accent",
  primary: "bg-accent border-accent text-accent-fg font-semibold hover:brightness-[1.08]",
  danger: "bg-card border-danger text-danger-fg hover:border-danger",
  ghost: "border-border bg-transparent text-muted hover:border-muted hover:text-fg",
  success:
    "border-status-success-border bg-status-success/10 font-semibold text-status-success hover:bg-status-success/20",
};

const sizeClasses: Record<Size, string> = {
  default: "px-3.5 py-1.5 text-[13px]",
  lg: "px-4 py-2.5 text-[13px]",
  sm: "px-2.5 py-0.5 text-xs",
};

export function Button({
  className,
  variant = "default",
  size = "default",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center rounded-md border disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
