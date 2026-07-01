// Tab identifiers + visibility, kept out of AppTabBar.tsx so that file only
// exports its component (react-refresh/only-export-components).

export type TabId =
  | "live"
  | "inventory"
  | "chests"
  | "pets"
  | "lookup"
  | "market"
  | "settings"
  | "about"
  | "debug";

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

// The live-memory diagnostics tab ships only in dev builds, not the production bar.
const DEV_TABS: { id: TabId; label: string }[] = [{ id: "debug", label: "Debug" }];

/** Visible tabs for the given build mode — dev-only tabs appear only when `isDev`. */
export function getVisibleTabs(isDev: boolean): { id: TabId; label: string }[] {
  return isDev ? [...TABS, ...DEV_TABS] : TABS;
}
