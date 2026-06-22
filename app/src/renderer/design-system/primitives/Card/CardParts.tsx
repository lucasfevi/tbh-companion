import type { HTMLAttributes } from "react";
import { cn } from "../../lib/variants";

/**
 * Card anatomy subcomponents, kept out of Card.tsx so that file only exports
 * its one named component — co-locating multiple component exports in one
 * file breaks Fast Refresh boundary detection (react-refresh/only-export-components).
 */
export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center gap-3", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-2", className)} {...props} />;
}

/** Render only when there's content (e.g. a future Steam Market price row) — an empty footer still draws its border. */
export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-t border-border pt-2 text-xs",
        className,
      )}
      {...props}
    />
  );
}
