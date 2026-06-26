import type { ReactNode } from "react";
import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { cn } from "../../lib/variants";

/**
 * Styled wrappers for Tabs.Root's children — kept out of Tabs.tsx so that
 * file only exports its one named component (co-locating multiple component
 * exports in one file breaks Fast Refresh boundary detection,
 * react-refresh/only-export-components). Active tab gets an accent
 * underline (Base UI's Indicator part, baked into TabsList so consumers
 * don't have to think about it). Used by `AppTabBar` for the main window tabs.
 */
export function TabsList({
  children,
  className,
  indicatorClassName,
}: {
  children: ReactNode;
  className?: string;
  /** Override the sliding underline — e.g. `transition-none` for instant tab bars. */
  indicatorClassName?: string;
}) {
  return (
    <BaseTabs.List
      className={cn("relative flex min-w-0 gap-0.5 border-b border-border bg-panel", className)}
    >
      {children}
      <BaseTabs.Indicator
        className={cn(
          "absolute bottom-0 h-0.5 rounded-full bg-accent transition-all duration-200 ease-out left-(--active-tab-left) w-(--active-tab-width)",
          indicatorClassName,
        )}
      />
    </BaseTabs.List>
  );
}

export function TabsTab({
  value,
  children,
  disabled,
  className,
}: {
  value: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <BaseTabs.Tab
      value={value}
      disabled={disabled}
      className={cn(
        "cursor-pointer rounded-t-md border-none px-3.5 py-2 text-[13px] text-muted hover:text-fg data-[selected]:font-semibold data-[selected]:text-fg data-[disabled]:pointer-events-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        className,
      )}
    >
      {children}
    </BaseTabs.Tab>
  );
}

export function TabsPanel({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <BaseTabs.Panel value={value} className={cn("text-fg", className)}>
      {children}
    </BaseTabs.Panel>
  );
}
