import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

const spinnerHidden =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]";

const densityClasses = {
  default: "px-2.5 py-1.5 text-[13px]",
  compact: "h-8 px-1.5 text-sm",
};

const alignClasses = {
  start: "text-left",
  center: "text-center",
};

export function NumberInput({
  density = "default",
  align = "start",
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  density?: keyof typeof densityClasses;
  align?: keyof typeof alignClasses;
}) {
  return (
    <input
      type="number"
      className={cn(
        "min-w-0 rounded-md border border-border bg-card text-fg tabular-nums",
        "focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-ideal/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        spinnerHidden,
        densityClasses[density],
        alignClasses[align],
        className,
      )}
      {...props}
    />
  );
}

export function NumberField({
  label,
  footer,
  footerAlign = "start",
  labelAlign = "start",
  density = "default",
  align = "start",
  className,
  inputClassName,
  ...inputProps
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: ReactNode;
  footer?: ReactNode;
  footerAlign?: "start" | "end";
  labelAlign?: "start" | "end";
  density?: keyof typeof densityClasses;
  align?: keyof typeof alignClasses;
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
      <NumberInput density={density} align={align} className={inputClassName} {...inputProps} />
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
