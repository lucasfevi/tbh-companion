import type { ReactNode } from "react";
import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { cn } from "../../lib/variants";

/**
 * Groups `TabsList`/`TabsTab`/`TabsPanel` (see `./TabsParts`) and owns the
 * active-tab state. Documented as the intended future upgrade for
 * `AppTabBar.tsx`, which today is a plain `<nav>` of `<button>`s with no
 * `role="tablist"`/`role="tab"` at all — a real a11y gap. **Not migrated in
 * this phase**: `AppTabBar` also hosts `AppToolbar` (non-tab buttons) in the
 * same row, which adds composition risk best handled as its own task, so
 * AppTabBar keeps its current markup for now.
 */
export function Tabs({
  value,
  defaultValue,
  onValueChange,
  children,
  className,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <BaseTabs.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={(next) => onValueChange?.(next as string)}
      className={cn("flex flex-col", className)}
    >
      {children}
    </BaseTabs.Root>
  );
}
