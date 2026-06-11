import { AppToolbar } from "./AppToolbar";
import { cn } from "../lib/cn";

export type TabId = "live" | "inventory" | "chests" | "market" | "settings" | "about";

const TABS: { id: TabId; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "inventory", label: "Inventory" },
  { id: "chests", label: "Chests" },
  { id: "market", label: "Market" },
  { id: "settings", label: "Settings" },
  { id: "about", label: "About" },
];

export function AppTabBar({ tab, onTabChange }: { tab: TabId; onTabChange: (tab: TabId) => void }) {
  return (
    <div className="flex items-end gap-2 border-b border-border bg-panel px-2 pt-1.5">
      <nav className="flex min-w-0 flex-1 gap-0.5" aria-label="Main tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={cn(
              "cursor-pointer rounded-t-md border-none px-3.5 py-2 text-[13px]",
              t.id === tab ? "bg-card text-fg" : "bg-transparent text-muted hover:text-fg",
            )}
            onClick={() => onTabChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <AppToolbar />
    </div>
  );
}
