import type { ReactNode } from "react";
import { DataListRow } from "../../design-system/primitives/DataList/DataList";
import { cn } from "../../lib/cn";

/** Striped rows inside a Live tab panel card (heroes, chest breakdown). */
export function LivePanelList({
  children,
  empty,
  className,
}: {
  children: ReactNode;
  empty?: ReactNode;
  className?: string;
}) {
  if (empty) {
    return <p className={cn("m-0 p-2.5 text-[13px] text-muted", className)}>{empty}</p>;
  }

  return <div className={cn("flex flex-col", className)}>{children}</div>;
}

export { DataListRow };
