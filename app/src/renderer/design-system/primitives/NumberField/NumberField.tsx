import type { FocusEventHandler, ReactNode } from "react";
import { NumberField as BaseNumberField } from "@base-ui/react/number-field";
import { cn, cva, type VariantProps } from "../../lib/variants";

const spinnerHidden =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]";

const inputVariants = cva(
  cn(
    "min-w-0 rounded-md border border-border bg-card text-fg tabular-nums",
    "focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-ideal/50",
    "disabled:cursor-not-allowed disabled:opacity-50",
    spinnerHidden,
  ),
  {
    variants: {
      density: {
        default: "px-2.5 py-1.5 text-[13px]",
        compact: "h-8 px-1.5 text-sm",
      },
      align: {
        start: "text-left",
        center: "text-center",
      },
    },
    defaultVariants: { density: "default", align: "start" },
  },
);

type NumberFieldVariants = VariantProps<typeof inputVariants>;

interface NumberInputBaseProps extends NumberFieldVariants {
  className?: string;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
  value?: number | null;
  disabled?: boolean;
  required?: boolean;
  readOnly?: boolean;
  id?: string;
  name?: string;
  onValueChange?: (value: number | null) => void;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  "aria-label"?: string;
}

/**
 * Bare number input — no native spinner buttons rendered (matches the app's
 * existing visual chrome), but gains Base UI's keyboard stepping (arrow
 * keys), min/max clamping, and character-level input filtering for free.
 */
export function NumberInput({
  density,
  align,
  className,
  min,
  max,
  step,
  defaultValue,
  value,
  disabled,
  required,
  readOnly,
  id,
  name,
  onValueChange,
  onBlur,
  onFocus,
  ...rest
}: NumberInputBaseProps) {
  return (
    <BaseNumberField.Root
      min={min}
      max={max}
      step={step}
      defaultValue={defaultValue}
      value={value}
      disabled={disabled}
      required={required}
      readOnly={readOnly}
      id={id}
      name={name}
      onValueChange={onValueChange}
    >
      <BaseNumberField.Input
        className={cn(inputVariants({ density, align }), className)}
        onBlur={onBlur}
        onFocus={onFocus}
        {...rest}
      />
    </BaseNumberField.Root>
  );
}

export function NumberField({
  label,
  footer,
  footerAlign = "start",
  labelAlign = "start",
  className,
  inputClassName,
  ...inputProps
}: NumberInputBaseProps & {
  label?: ReactNode;
  footer?: ReactNode;
  footerAlign?: "start" | "end";
  labelAlign?: "start" | "end";
  inputClassName?: string;
}) {
  return (
    <label
      className={cn(
        "flex flex-col gap-1 text-[10px] text-muted",
        labelAlign === "end" ? "items-end" : "items-start",
        className,
      )}
    >
      {label ? <span>{label}</span> : null}
      <NumberInput className={inputClassName} {...inputProps} />
      {footer != null ? (
        <div
          className={cn(
            "min-h-[1.125rem] w-full text-[10px] leading-none",
            footerAlign === "end" ? "text-right" : "text-left",
          )}
        >
          {footer}
        </div>
      ) : null}
    </label>
  );
}
