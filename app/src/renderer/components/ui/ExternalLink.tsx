import type { AnchorHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

// Button-shaped variants ("button"/"primaryButton") moved to ButtonLink in
// design-system/primitives/Button — these two are text-link-only.
type ExternalLinkVariant = "inline" | "accent";

const variantClasses: Record<ExternalLinkVariant, string> = {
  inline:
    "text-muted no-underline hover:text-accent hover:underline focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
  accent:
    "inline-flex w-fit text-sm font-semibold text-accent underline decoration-accent/60 underline-offset-4 hover:text-fg hover:decoration-accent focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
};

export function ExternalLink({
  children,
  className,
  rel = "noopener noreferrer",
  target = "_blank",
  variant = "inline",
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: ExternalLinkVariant }) {
  return (
    <a className={cn(variantClasses[variant], className)} rel={rel} target={target} {...props}>
      {children}
    </a>
  );
}
