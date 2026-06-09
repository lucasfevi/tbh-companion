import { useState } from "react";
import { Live } from "./tabs/Live";
import { Inventory } from "./tabs/Inventory";
import { Market } from "./tabs/Market";

type TabId = "live" | "inventory" | "market";

const TABS: { id: TabId; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "inventory", label: "Inventory" },
  { id: "market", label: "Market" },
];

export function App() {
  const [tab, setTab] = useState<TabId>("live");

  return (
    <div className="app">
      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={t.id === tab ? "tab active" : "tab"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        <button className="tab overlay-toggle" title="Open mini overlay" onClick={() => window.tbh.openOverlay()}>
          {"\u25a3"} Mini
        </button>
      </nav>
      <main className="content">
        {tab === "live" && <Live />}
        {tab === "inventory" && <Inventory />}
        {tab === "market" && <Market />}
      </main>
    </div>
  );
}
