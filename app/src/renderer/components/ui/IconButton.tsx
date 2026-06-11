import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export function IconButton({
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cn(
        "cursor-pointer rounded border-none bg-transparent px-1.5 py-0.5 text-[13px] text-muted hover:bg-card hover:text-fg",
        className,
      )}
      {...props}
    />
  );
}
