import { forwardRef, type ElementType, type HTMLAttributes } from "react";
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

export const Card = forwardRef<
  HTMLElement,
  HTMLAttributes<HTMLElement> & VariantProps<typeof cardVariants> & { as?: CardElement }
>(function Card({ as: Tag = "div", className, padding, ...props }, ref) {
  const Element = Tag as ElementType;
  return <Element ref={ref} className={cn(cardVariants({ padding }), className)} {...props} />;
});
