import type { ReactNode } from "react";
import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { cn } from "../../lib/variants";

/**
 * Styled wrappers for Tabs.Root's children — kept out of Tabs.tsx so that
 * file only exports its one named component (co-locating multiple component
 * exports in one file breaks Fast Refresh boundary detection,
 * react-refresh/only-export-components). Visual treatment mirrors
 * AppTabBar.tsx's current look (active: bg-card text-fg; inactive: muted)
 * so a future AppTabBar migration is a drop-in style match, not a re-skin.
 */
export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <BaseTabs.List
      className={cn("flex min-w-0 gap-0.5 border-b border-border bg-panel", className)}
    >
      {children}
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
        "cursor-pointer rounded-t-md border-none px-3.5 py-2 text-[13px] text-muted hover:text-fg data-[selected]:bg-card data-[selected]:text-fg disabled:cursor-not-allowed disabled:opacity-50",
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
