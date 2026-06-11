import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

/**
 * Icon-only control. `edge` applies negative margin on one side so the glyph
 * aligns optically with adjacent content (MUI IconButton `edge` pattern).
 */
export function IconButton({
  className,
  edge,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  edge?: "start" | "end";
}) {
  return (
    <button
      type={type}
      className={cn(
        "cursor-pointer rounded border-none bg-transparent px-1 py-0 text-[13px] leading-none text-muted hover:bg-card hover:text-fg",
        edge === "start" && "-ml-1",
        edge === "end" && "-mr-1",
        className,
      )}
      {...props}
    />
  );
}
