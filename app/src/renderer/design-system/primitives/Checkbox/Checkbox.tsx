import type { ReactNode } from "react";
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { LuCheck } from "react-icons/lu";
import { cn } from "../../lib/variants";

/**
 * Themed checkbox built on Base UI's Checkbox. Replaces hand-rolled native
 * `<input type="checkbox">` controls so the box matches the app's tokens. Pass
 * `label` for the standard "box + text" row (wraps a clickable `<label>`); omit
 * it for a bare box and supply `aria-label` instead.
 */
export function Checkbox({
  checked,
  onCheckedChange,
  label,
  disabled,
  className,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const box = (
    <BaseCheckbox.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={label == null ? ariaLabel : undefined}
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border bg-card text-accent-fg transition-colors data-[checked]:border-accent data-[checked]:bg-accent disabled:cursor-not-allowed disabled:opacity-50",
        label == null ? className : undefined,
      )}
    >
      <BaseCheckbox.Indicator className="flex items-center justify-center text-[11px]">
        <LuCheck aria-hidden />
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );

  if (label == null) return box;

  return (
    <label
      className={cn(
        "flex cursor-pointer flex-row items-center gap-2 text-xs text-muted",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      {box}
      <span>{label}</span>
    </label>
  );
}
