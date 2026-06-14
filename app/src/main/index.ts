import "./appIdentity";
import "./logInit";

import { app } from "electron";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { attachExternalLinkHandlers } from "./app/lifecycle";
import { acquireSingleInstanceLock, registerSecondInstanceFocus } from "./app/singleInstance";
import { createLogger } from "./log";
import { getAppServices, restoreSessionWindows, startTracking, stopTracking } from "./app/appState";
import { registerIpc } from "./ipc/registerIpc";
import { createTray, destroyTray, isAppQuitting, setAppQuitting } from "./tray/trayService";

const isPrimaryInstance = acquireSingleInstanceLock();

if (isPrimaryInstance) {
  registerSecondInstanceFocus(() => {
    getAppServices().showMain();
  });

  app.on("web-contents-created", (_event, contents) => {
    attachExternalLinkHandlers(contents);
  });

  function appVersion(): string {
    try {
      const pkg = JSON.parse(readFileSync(join(__dirname, "../../package.json"), "utf-8")) as {
        version?: string;
      };
      return pkg.version ?? "unknown";
    } catch {
      return "unknown";
    }
  }

  app.whenReady().then(() => {
    const appLog = createLogger("app");
    appLog.info(`TBH Companion v${appVersion()} ready`);
    const sessionUi = startTracking();
    const services = getAppServices();
    registerIpc(services);
    services.startUpdates();
    createTray(services);
    restoreSessionWindows(sessionUi);

    app.on("activate", () => {
      getAppServices().showMain();
    });
  });

  app.on("before-quit", () => {
    createLogger("app").info("App quitting");
    setAppQuitting(true);
    const services = getAppServices();
    services.stopUpdates();
    services.flushSession();
    destroyTray();
  });

  app.on("window-all-closed", () => {
    if (isAppQuitting()) {
      stopTracking();
      if (process.platform !== "darwin") app.quit();
    }
  });
}
