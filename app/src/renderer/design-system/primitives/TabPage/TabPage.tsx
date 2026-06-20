import type { ReactNode } from "react";
import { cn } from "../../lib/variants";

export function TabPage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-3.5", className)}>{children}</div>;
}
