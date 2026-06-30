import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/variants";
import { buttonVariants, type ButtonVariants } from "./buttonVariants";
import { Tooltip } from "../Tooltip/Tooltip";

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> &
    ButtonVariants & {
      /**
       * Keep `title` as a plain native attribute instead of wrapping it in a
       * Tooltip. Only for the frameless overlay/box-tracker windows, which
       * never host a Base UI portal (see DESIGN-SYSTEM.md "Base UI portals
       * are safe per-window") — a Tooltip popup escaping those tiny bounds
       * would be visually broken.
       */
      nativeTitle?: boolean;
    }
>(function Button(
  {
    className,
    variant,
    size,
    edge,
    type = "button",
    title,
    nativeTitle,
    "aria-label": ariaLabel,
    ...props
  },
  ref,
) {
  const button = (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size, edge }), className)}
      title={nativeTitle ? title : undefined}
      aria-label={ariaLabel ?? title}
      {...props}
    />
  );
  return title && !nativeTitle ? <Tooltip trigger={button}>{title}</Tooltip> : button;
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
