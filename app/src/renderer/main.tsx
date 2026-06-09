import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { Overlay } from "./Overlay";
import { TbhProvider } from "./context/TbhProvider";
import { ErrorBoundary } from "./lib/ErrorBoundary";
import "./styles.css";

const isOverlay = window.location.hash.replace("#", "") === "overlay";

function Root() {
  return (
    <ErrorBoundary title="TBH Companion failed to start">
      <TbhProvider>{isOverlay ? <Overlay /> : <App />}</TbhProvider>
    </ErrorBoundary>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
