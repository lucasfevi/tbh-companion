import type { HTMLAttributes } from "react";
import { cn, cva, type VariantProps } from "../../lib/variants";

const cardVariants = cva("rounded-lg border border-border bg-card", {
  variants: {
    padding: {
      default: "p-3",
      compact: "p-2.5",
      none: "",
    },
  },
  defaultVariants: { padding: "default" },
});

type CardElement = "div" | "li";

export function Card({
  as: Tag = "div",
  className,
  padding,
  ...props
}: HTMLAttributes<HTMLElement> & VariantProps<typeof cardVariants> & { as?: CardElement }) {
  return <Tag className={cn(cardVariants({ padding }), className)} {...props} />;
}
