import { app } from "electron";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { attachExternalLinkHandlers } from "./app/lifecycle";
import { createLogger, initDiagnosticLog } from "./log";
import { getAppServices, openMainWindow, startTracking, stopTracking } from "./app/appState";
import { registerIpc } from "./ipc/registerIpc";
import { createTray, destroyTray, isAppQuitting, setAppQuitting } from "./tray/trayService";

app.on("web-contents-created", (_event, contents) => {
  attachExternalLinkHandlers(contents);
});

function appVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, "../../package.json"), "utf-8"),
    ) as { version?: string };
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

app.whenReady().then(() => {
  initDiagnosticLog();
  const appLog = createLogger("app");
  appLog.info(`TBH Companion v${appVersion()} ready`);
  startTracking();
  const services = getAppServices();
  registerIpc(services);
  createTray(services);
  openMainWindow();

  app.on("activate", () => {
    openMainWindow();
  });
});

app.on("before-quit", () => {
  createLogger("app").info("App quitting");
  setAppQuitting(true);
  destroyTray();
});

app.on("window-all-closed", () => {
  if (isAppQuitting()) {
    stopTracking();
    if (process.platform !== "darwin") app.quit();
  }
});
