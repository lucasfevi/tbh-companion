import type { AnchorHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type ExternalLinkVariant = "inline" | "accent" | "button" | "primaryButton";

const variantClasses: Record<ExternalLinkVariant, string> = {
  inline:
    "text-muted no-underline hover:text-accent hover:underline focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
  accent:
    "inline-flex w-fit text-sm font-semibold text-accent underline decoration-accent/60 underline-offset-4 hover:text-fg hover:decoration-accent focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
  button:
    "inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-0.5 text-xs text-fg no-underline hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
  primaryButton:
    "inline-flex items-center justify-center gap-1.5 rounded-md border border-accent bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-accent-fg no-underline hover:brightness-[1.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
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
