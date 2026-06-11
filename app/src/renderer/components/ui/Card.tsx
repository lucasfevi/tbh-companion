import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type Padding = "default" | "compact" | "none";
type CardElement = "div" | "li";

const paddingClasses: Record<Padding, string> = {
  default: "p-3",
  compact: "p-2.5",
  none: "",
};

export function Card({
  as: Tag = "div",
  className,
  padding = "default",
  ...props
}: HTMLAttributes<HTMLElement> & { as?: CardElement; padding?: Padding }) {
  return (
    <Tag
      className={cn("rounded-lg border border-border bg-card", paddingClasses[padding], className)}
      {...props}
    />
  );
}
