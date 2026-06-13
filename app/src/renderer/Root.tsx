import { App } from "./App";
import { Overlay } from "./Overlay";
import { BoxTracker } from "./BoxTracker";
import { TbhProvider } from "./context/TbhProvider";
import { ErrorBoundary } from "./lib/ErrorBoundary";

const hash = window.location.hash.replace("#", "");
const isOverlay = hash === "overlay";
const isBoxTracker = hash === "box-tracker";

if (isOverlay || isBoxTracker) {
  document.documentElement.classList.add("overflow-hidden");
  document.body.classList.add("overflow-hidden");
}

export function Root() {
  const renderContent = () => {
    if (isOverlay) return <Overlay />;
    if (isBoxTracker) return <BoxTracker />;
    return <App />;
  };

  return (
    <ErrorBoundary title="TBH Companion failed to start">
      <TbhProvider>{renderContent()}</TbhProvider>
    </ErrorBoundary>
  );
}
