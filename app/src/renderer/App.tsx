import { lazy, Suspense, useState } from "react";
import { ErrorBoundary } from "./lib/ErrorBoundary";
import { AppTabBar, type TabId } from "./components/AppTabBar";
import { SaveStatusBar } from "./components/SaveStatusBar";

const Live = lazy(() => import("./tabs/Live").then((m) => ({ default: m.Live })));
const Inventory = lazy(() => import("./tabs/Inventory").then((m) => ({ default: m.Inventory })));
const Chests = lazy(() => import("./tabs/Chests").then((m) => ({ default: m.Chests })));
const Market = lazy(() => import("./tabs/Market").then((m) => ({ default: m.Market })));
const Settings = lazy(() => import("./tabs/Settings").then((m) => ({ default: m.Settings })));
const About = lazy(() => import("./tabs/About").then((m) => ({ default: m.About })));

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
        <AppTabBar tab={tab} onTabChange={setTab} />
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
