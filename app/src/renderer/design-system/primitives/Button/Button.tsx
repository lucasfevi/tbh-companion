import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/variants";
import { buttonVariants, type ButtonVariants } from "./buttonVariants";

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & ButtonVariants
>(function Button({ className, variant, size, edge, type = "button", ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size, edge }), className)}
      {...props}
    />
  );
});

/**
 * Anchor-tag counterpart of Button — absorbs ExternalLink's `button` /
 * `primaryButton` variants. Kept as a separate component (not a polymorphic
 * `as` prop on Button) to avoid fighting TypeScript's ButtonHTMLAttributes vs
 * AnchorHTMLAttributes discriminated prop types for just two call shapes.
 */
export const ButtonLink = forwardRef<
  HTMLAnchorElement,
  AnchorHTMLAttributes<HTMLAnchorElement> & ButtonVariants
>(function ButtonLink(
  { className, variant, size, edge, rel = "noopener noreferrer", target = "_blank", ...props },
  ref,
) {
  return (
    <a
      ref={ref}
      rel={rel}
      target={target}
      className={cn(buttonVariants({ variant, size, edge }), className)}
      {...props}
    />
  );
});
