import { lazy, Suspense, useState } from "react";
import { useStats } from "./lib/useStats";
import { fmtAgo } from "./lib/format";
import { ErrorBoundary } from "./lib/ErrorBoundary";

const Live = lazy(() => import("./tabs/Live").then((m) => ({ default: m.Live })));
const Inventory = lazy(() => import("./tabs/Inventory").then((m) => ({ default: m.Inventory })));
const Market = lazy(() => import("./tabs/Market").then((m) => ({ default: m.Market })));
const Settings = lazy(() => import("./tabs/Settings").then((m) => ({ default: m.Settings })));

const IDLE_THRESHOLD = 120;

type TabId = "live" | "inventory" | "market" | "settings";

const TABS: { id: TabId; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "inventory", label: "Inventory" },
  { id: "market", label: "Market" },
  { id: "settings", label: "Settings" },
];

function TabFallback() {
  return (
    <div className="placeholder">
      <p className="muted">Loading tab…</p>
    </div>
  );
}

export function App() {
  const [tab, setTab] = useState<TabId>("live");

  return (
    <div className="app">
      <header className="savebar-host">
        <nav className="tabs" aria-label="Main tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={t.id === tab ? "tab active" : "tab"}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            className="tab overlay-toggle"
            title="Open mini overlay"
            onClick={() => window.tbh.openOverlay()}
          >
            {"\u25a3"} Mini
          </button>
        </nav>
        <SaveStatusBar />
      </header>
      <main className="content">
        <ErrorBoundary title={`${tab} tab crashed`}>
          <Suspense fallback={<TabFallback />}>
            {tab === "live" && <Live />}
            {tab === "inventory" && <Inventory />}
            {tab === "market" && <Market />}
            {tab === "settings" && <Settings />}
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}

function SaveStatusBar() {
  const stats = useStats();
  const since = stats?.secondsSinceRead ?? null;
  const idle = since !== null && since > IDLE_THRESHOLD;

  let text: string;
  if (!stats || !stats.connected) text = "Connecting to the save file...";
  else if (since === null) text = "Waiting for the first save read...";
  else text = `Save written ${fmtAgo(since)}`;

  return (
    <div className={idle ? "savebar warn" : "savebar"} role="status">
      <span className="savebar-dot" aria-hidden />
      <span>{text}</span>
      {idle && <span className="savebar-hint">- is the game running?</span>}
    </div>
  );
}
