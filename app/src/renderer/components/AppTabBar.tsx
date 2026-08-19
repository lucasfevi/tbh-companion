import { AppToolbar } from "./AppToolbar";
import { Tabs } from "../design-system/primitives/Tabs/Tabs";
import { TabsList, TabsTab } from "../design-system/primitives/Tabs/TabsParts";

export type TabId =
  | "live"
  | "inventory"
  | "chests"
  | "pets"
  | "lookup"
  | "market"
  | "settings"
  | "about";

const TABS: { id: TabId; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "inventory", label: "Inventory" },
  { id: "chests", label: "Chests" },
  { id: "pets", label: "Pets" },
  { id: "lookup", label: "Lookup" },
  { id: "market", label: "Market" },
  { id: "settings", label: "Settings" },
  { id: "about", label: "About" },
];

export function AppTabBar({ tab, onTabChange }: { tab: TabId; onTabChange: (tab: TabId) => void }) {
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
          {TABS.map((t) => (
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
