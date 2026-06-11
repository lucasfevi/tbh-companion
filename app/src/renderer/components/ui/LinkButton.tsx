import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export function LinkButton({
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cn(
        "cursor-pointer border-none bg-transparent p-0 font-inherit text-inherit underline",
        className,
      )}
      {...props}
    />
  );
}
