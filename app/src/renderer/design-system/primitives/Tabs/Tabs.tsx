import type { ReactNode } from "react";
import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { cn } from "../../lib/variants";

/**
 * Groups `TabsList`/`TabsTab`/`TabsPanel` (see `./TabsParts`) and owns the
 * active-tab state. `AppTabBar` uses this for the main window's tab navigation.
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
