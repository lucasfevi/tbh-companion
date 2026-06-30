import type { ReactNode } from "react";
import { cn } from "../../lib/variants";
import { Tooltip } from "../Tooltip/Tooltip";

export function Field({
  label,
  hint,
  checkbox,
  children,
  className,
  title,
}: {
  label: ReactNode;
  hint?: ReactNode;
  /** @deprecated Use the `Checkbox` primitive with its own `label` prop instead. */
  checkbox?: boolean;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  const renderContent = () => {
    if (checkbox) {
      return (
        <label className={cn("flex flex-row items-center gap-2 text-xs text-muted", className)}>
          {children}
          <span>{label}</span>
        </label>
      );
    }

    return (
      <label className={cn("flex flex-col gap-1 text-xs text-muted", className)}>
        <span>{label}</span>
        {children}
        {hint ? <span className="text-xs text-muted">{hint}</span> : null}
      </label>
    );
  };

  const content = renderContent();
  return title ? <Tooltip trigger={content}>{title}</Tooltip> : content;
}
