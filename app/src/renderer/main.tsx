import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { Overlay } from "./Overlay";
import { BoxTracker } from "./BoxTracker";
import { TbhProvider } from "./context/TbhProvider";
import { ErrorBoundary } from "./lib/ErrorBoundary";
import "./styles.css";

const hash = window.location.hash.replace("#", "");
const isOverlay = hash === "overlay";
const isBoxTracker = hash === "box-tracker";

if (isOverlay || isBoxTracker) {
  document.documentElement.classList.add("overflow-hidden");
  document.body.classList.add("overflow-hidden");
}

function Root() {
  let content;
  if (isOverlay) content = <Overlay />;
  else if (isBoxTracker) content = <BoxTracker />;
  else content = <App />;

  return (
    <ErrorBoundary title="TBH Companion failed to start">
      <TbhProvider>{content}</TbhProvider>
    </ErrorBoundary>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
