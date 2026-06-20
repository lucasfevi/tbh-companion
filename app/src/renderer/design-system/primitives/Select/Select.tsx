import type { ReactNode } from "react";
import { Select as BaseSelect } from "@base-ui/react/select";
import { cn, cva, type VariantProps } from "../../lib/variants";

export type SelectOption = {
  value: string | number;
  label: string;
};

const triggerVariants = cva(
  "flex w-full min-w-0 items-center justify-between gap-2 rounded-md border py-1.5 pl-2.5 pr-2 text-left text-[13px] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-ideal/50 disabled:cursor-not-allowed disabled:opacity-50 data-[popup-open]:z-30",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-fg",
        ideal: "border-ideal/30 bg-bg/50 font-semibold text-ideal",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

const optionVariants = cva(
  "w-full cursor-default px-2.5 py-1.5 text-left text-[13px] leading-snug font-normal outline-none data-[highlighted]:bg-panel data-[selected]:bg-ideal/15 data-[selected]:font-semibold",
  {
    variants: {
      variant: {
        default: "text-fg",
        ideal: "text-ideal",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function SelectChevron() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      className="shrink-0 text-muted transition-transform duration-150 group-data-[popup-open]:rotate-180"
      aria-hidden
    >
      <path
        d="M2.5 4.5 6 8 9.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Select({
  label,
  variant,
  footer,
  footerAlign = "start",
  className,
  options,
  value,
  onValueChange,
  disabled,
}: {
  label?: ReactNode;
  footer?: ReactNode;
  footerAlign?: "start" | "end";
  className?: string;
  options: SelectOption[];
  value: string | number;
  onValueChange: (value: string | number) => void;
  disabled?: boolean;
} & VariantProps<typeof triggerVariants>) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <BaseSelect.Root<string | number>
        items={options}
        value={value}
        onValueChange={(next) => {
          if (next != null) onValueChange(next);
        }}
        disabled={disabled}
        isItemEqualToValue={(a, b) => String(a) === String(b)}
      >
        {label ? (
          <BaseSelect.Label className="text-[10px] font-medium uppercase tracking-wide text-muted">
            {label}
          </BaseSelect.Label>
        ) : null}
        <BaseSelect.Trigger className={cn(triggerVariants({ variant }), "group")}>
          <BaseSelect.Value className="min-w-0 truncate" />
          <span className="flex w-6 shrink-0 items-center justify-center">
            <SelectChevron />
          </span>
        </BaseSelect.Trigger>
        <BaseSelect.Portal>
          <BaseSelect.Positioner alignItemWithTrigger={false} sideOffset={4} className="z-30">
            <BaseSelect.Popup className="max-h-52 w-(--anchor-width) overflow-y-auto rounded-md border border-border bg-card py-1 shadow-[0_8px_24px_rgb(0_0_0/0.45)]">
              {options.map((option) => (
                <BaseSelect.Item
                  key={option.value}
                  value={option.value}
                  className={optionVariants({ variant })}
                >
                  <BaseSelect.ItemText>{option.label}</BaseSelect.ItemText>
                </BaseSelect.Item>
              ))}
            </BaseSelect.Popup>
          </BaseSelect.Positioner>
        </BaseSelect.Portal>
      </BaseSelect.Root>
      {footer != null ? (
        <div
          className={cn(
            "min-h-[1.125rem] text-[10px] leading-none",
            footerAlign === "end" ? "text-right" : "text-left",
          )}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}
