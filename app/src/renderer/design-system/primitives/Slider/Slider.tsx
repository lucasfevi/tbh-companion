import type { ReactNode } from "react";
import { Slider as BaseSlider } from "@base-ui/react/slider";
import { cn } from "../../lib/variants";

/**
 * Single-thumb numeric slider built on Base UI's Slider. Bounds (`min`/`max`)
 * are supplied by the consumer — the primitive never derives them from data.
 */
export function Slider({
  min,
  max,
  step = 1,
  value,
  onValueChange,
  label,
  formatValue = (n) => String(n),
  disabled,
  className,
  onPointerUp,
  onBlur,
}: {
  min: number;
  max: number;
  step?: number;
  value: number;
  onValueChange: (value: number) => void;
  label?: ReactNode;
  formatValue?: (n: number) => string;
  disabled?: boolean;
  className?: string;
  onPointerUp?: () => void;
  onBlur?: () => void;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label != null ? (
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-muted">{label}</span>
          <span className="text-[11px] tabular-nums text-fg">{formatValue(value)}</span>
        </div>
      ) : null}
      <BaseSlider.Root
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onValueChange={(next) => {
          const n = Array.isArray(next) ? next[0] : next;
          onValueChange(n);
        }}
      >
        <BaseSlider.Control
          className="flex h-5 w-full items-center py-2 data-[disabled]:opacity-50"
          onPointerUp={onPointerUp}
          onBlur={onBlur}
        >
          <BaseSlider.Track className="relative h-1 w-full rounded-full bg-border">
            <BaseSlider.Indicator className="absolute h-full rounded-full bg-accent" />
            <BaseSlider.Thumb
              aria-label={typeof label === "string" ? label.toLowerCase() : "value"}
              className="h-3.5 w-3.5 rounded-full border border-accent bg-card shadow-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ideal/60"
            />
          </BaseSlider.Track>
        </BaseSlider.Control>
      </BaseSlider.Root>
    </div>
  );
}
