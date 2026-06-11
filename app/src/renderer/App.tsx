import { lazy, Suspense, useState } from "react";
import { useStats } from "./lib/useStats";
import { fmtAgo } from "./lib/format";
import { ErrorBoundary } from "./lib/ErrorBoundary";
import { AppToolbar } from "./components/AppToolbar";
import { cn } from "./lib/cn";

const Live = lazy(() => import("./tabs/Live").then((m) => ({ default: m.Live })));
const Inventory = lazy(() => import("./tabs/Inventory").then((m) => ({ default: m.Inventory })));
const Chests = lazy(() => import("./tabs/Chests").then((m) => ({ default: m.Chests })));
const Market = lazy(() => import("./tabs/Market").then((m) => ({ default: m.Market })));
const Settings = lazy(() => import("./tabs/Settings").then((m) => ({ default: m.Settings })));
const About = lazy(() => import("./tabs/About").then((m) => ({ default: m.About })));

const IDLE_THRESHOLD = 120;

type TabId = "live" | "inventory" | "chests" | "market" | "settings" | "about";

const TABS: { id: TabId; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "inventory", label: "Inventory" },
  { id: "chests", label: "Chests" },
  { id: "market", label: "Market" },
  { id: "settings", label: "Settings" },
  { id: "about", label: "About" },
];

function TabFallback() {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="m-0 text-muted">Loading tab…</p>
    </div>
  );
}

export function App() {
  const [tab, setTab] = useState<TabId>("live");

  return (
    <div className="flex h-full flex-col">
      <header>
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
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <AppToolbar />
        </div>
        <SaveStatusBar />
      </header>
      <main className="min-h-0 flex-1 overflow-auto p-5">
        <ErrorBoundary title={`${tab} tab crashed`}>
          <Suspense fallback={<TabFallback />}>
            {tab === "live" && <Live />}
            {tab === "inventory" && <Inventory onOpenChests={() => setTab("chests")} />}
            {tab === "chests" && <Chests />}
            {tab === "market" && <Market />}
            {tab === "settings" && <Settings />}
            {tab === "about" && <About />}
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
    <div
      className={cn(
        "flex items-center gap-2 border-b border-border px-3.5 py-1.5 text-xs",
        idle && "text-gold",
      )}
      role="status"
    >
      <span
        className={cn("size-2 shrink-0 rounded-full bg-accent", idle && "bg-gold")}
        aria-hidden
      />
      <span>{text}</span>
      {idle && <span className="text-gold">- is the game running?</span>}
    </div>
  );
}
