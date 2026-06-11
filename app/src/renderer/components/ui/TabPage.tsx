import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function TabPage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-3.5", className)}>{children}</div>;
}
