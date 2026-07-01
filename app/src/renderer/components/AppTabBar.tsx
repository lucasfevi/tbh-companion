import { AppToolbar } from "./AppToolbar";
import { getVisibleTabs, type TabId } from "./appTabs";
import { Tabs } from "../design-system/primitives/Tabs/Tabs";
import { TabsList, TabsTab } from "../design-system/primitives/Tabs/TabsParts";

export type { TabId };

export function AppTabBar({ tab, onTabChange }: { tab: TabId; onTabChange: (tab: TabId) => void }) {
  const tabs = getVisibleTabs(import.meta.env.DEV);
  return (
    <div className="flex items-end gap-2 border-b border-border bg-panel px-2 pt-1.5">
      <Tabs
        value={tab}
        onValueChange={(value) => onTabChange(value as TabId)}
        className="min-w-0 flex-1"
      >
        <TabsList
          className="border-b-0 bg-transparent px-0"
          indicatorClassName="transition-none"
          aria-label="Main tabs"
        >
          {tabs.map((t) => (
            <TabsTab key={t.id} value={t.id} className="data-[selected]:font-medium">
              {t.label}
            </TabsTab>
          ))}
        </TabsList>
      </Tabs>
      <AppToolbar />
    </div>
  );
}
