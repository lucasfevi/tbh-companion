import type { ReactNode } from "react";
import { Slider } from "@base-ui/react/slider";
import { cn } from "../../lib/variants";

/**
 * Dual-thumb numeric range built on Base UI's Slider. Bounds (`min`/`max`) are
 * supplied by the consumer — the primitive never derives them from data. The
 * value is always a `[lo, hi]` tuple; the consumer decides what a full-bounds
 * range means (e.g. "no filter").
 */
export function RangeSlider({
  min,
  max,
  step = 1,
  value,
  onValueChange,
  label,
  formatValue = (n) => `Lv ${n}`,
  disabled,
  className,
}: {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onValueChange: (value: [number, number]) => void;
  label?: ReactNode;
  formatValue?: (n: number) => string;
  disabled?: boolean;
  className?: string;
}) {
  const [lo, hi] = value;
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label != null ? (
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
            {label}
          </span>
          <span className="text-[11px] tabular-nums text-fg">
            {formatValue(lo)} – {formatValue(hi)}
          </span>
        </div>
      ) : null}
      <Slider.Root
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onValueChange={(next) => {
          const tuple = Array.isArray(next) ? next : [next, next];
          onValueChange([tuple[0], tuple[1]] as [number, number]);
        }}
      >
        <Slider.Control className="flex h-5 w-full items-center py-2 data-[disabled]:opacity-50">
          <Slider.Track className="relative h-1 w-full rounded-full bg-border">
            <Slider.Indicator className="absolute h-full rounded-full bg-accent" />
            <Slider.Thumb
              index={0}
              aria-label={`Minimum ${typeof label === "string" ? label.toLowerCase() : "value"}`}
              className="h-3.5 w-3.5 rounded-full border border-accent bg-card shadow-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ideal/60"
            />
            <Slider.Thumb
              index={1}
              aria-label={`Maximum ${typeof label === "string" ? label.toLowerCase() : "value"}`}
              className="h-3.5 w-3.5 rounded-full border border-accent bg-card shadow-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ideal/60"
            />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
    </div>
  );
}
