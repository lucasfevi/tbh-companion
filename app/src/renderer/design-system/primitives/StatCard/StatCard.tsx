import type { ReactNode } from "react";
import { Card } from "../Card/Card";
import { Tooltip } from "../Tooltip/Tooltip";
import { cn, cva, type VariantProps } from "../../lib/variants";

const cardVariants = cva("flex flex-col gap-1", {
  variants: {
    variant: {
      default: "bg-panel",
      highlight: "",
    },
  },
  defaultVariants: { variant: "default" },
});

const labelVariants = cva("text-muted", {
  variants: {
    variant: {
      default: "text-[11px] uppercase tracking-wide",
      highlight: "text-[12px] tracking-wide",
    },
  },
  defaultVariants: { variant: "default" },
});

const valueVariants = cva("", {
  variants: {
    variant: {
      default: "text-lg font-semibold tabular-nums",
      highlight: "text-[32px] font-bold leading-none text-accent",
    },
  },
  defaultVariants: { variant: "default" },
});

const detailVariants = cva("text-muted", {
  variants: {
    variant: {
      default: "text-[11px]",
      highlight: "text-xs",
    },
  },
  defaultVariants: { variant: "default" },
});

type StatCardVariants = VariantProps<typeof cardVariants>;

export function StatCard({
  label,
  value,
  valueFirst = false,
  valueClassName,
  detail,
  className,
  title,
  variant = "default",
}: {
  label: ReactNode;
  value: ReactNode;
  valueFirst?: boolean;
  valueClassName?: string;
  detail?: ReactNode;
  className?: string;
  title?: string;
} & StatCardVariants) {
  const valueNode = <span className={cn(valueVariants({ variant }), valueClassName)}>{value}</span>;

  const card = (
    <Card
      padding={variant === "highlight" ? "default" : "compact"}
      className={cn(cardVariants({ variant }), title && "cursor-help", className)}
      tabIndex={title ? 0 : undefined}
    >
      {valueFirst ? (
        <>
          {valueNode}
          {detail ? <div className={detailVariants({ variant })}>{detail}</div> : null}
          <div className={labelVariants({ variant })}>{label}</div>
        </>
      ) : (
        <>
          <span className={labelVariants({ variant })}>{label}</span>
          {valueNode}
          {detail ? <div className={detailVariants({ variant })}>{detail}</div> : null}
        </>
      )}
    </Card>
  );

  return title ? <Tooltip trigger={card}>{title}</Tooltip> : card;
}
