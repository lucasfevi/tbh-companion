import type { ReactNode } from "react";
import { cn } from "../../lib/variants";
import { Tooltip } from "../Tooltip/Tooltip";

/**
 * Presentational inline entity link — icon + colored label, optional suffix and
 * peek tooltip. Domain wrappers (e.g. ItemLink) supply game-specific wiring;
 * this primitive stays free of core imports and domain types.
 */
export function EntityLink({
  icon,
  label,
  color,
  suffix,
  suffixTone = "muted",
  onClick,
  peek,
  className,
}: {
  icon?: ReactNode;
  label: string;
  color?: string;
  suffix?: string;
  suffixTone?: "muted" | "gold";
  onClick?: () => void;
  peek?: ReactNode;
  className?: string;
}) {
  const triggerClassName = cn(
    "inline-flex w-fit max-w-full items-center gap-1 rounded text-[13px]",
    onClick
      ? "cursor-pointer focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-ideal/50"
      : null,
    !color ? "text-fg" : null,
    className,
  );

  const labelEl = (
    <span
      className={cn("truncate", onClick && "hover:underline")}
      style={color ? { color } : undefined}
    >
      {label}
    </span>
  );

  const trigger = onClick ? (
    <button type="button" className={triggerClassName} onClick={onClick}>
      {icon}
      {labelEl}
    </button>
  ) : (
    <span className={triggerClassName}>
      {icon}
      {labelEl}
    </span>
  );

  const interactive =
    peek != null ? (
      <Tooltip trigger={trigger} className="w-64 border-0 bg-transparent p-0 shadow-none">
        <div className="shadow-[0_8px_24px_rgb(0_0_0/0.45)]">{peek}</div>
      </Tooltip>
    ) : (
      trigger
    );

  if (!suffix) {
    return <span className="w-fit max-w-full self-start">{interactive}</span>;
  }

  return (
    <span className="inline-flex w-fit max-w-full items-center gap-1 self-start text-[13px]">
      {interactive}
      <span
        className={cn("shrink-0 text-[11px]", suffixTone === "gold" ? "text-gold" : "text-muted")}
      >
        {suffix}
      </span>
    </span>
  );
}
