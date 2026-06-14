import { app } from "electron";

import { createLogger } from "../log";

const appLog = createLogger("app");

export function acquireSingleInstanceLock(): boolean {
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
    return false;
  }
  return true;
}

export function registerSecondInstanceFocus(handler: () => void): void {
  app.on("second-instance", () => {
    appLog.info("Second launch detected — focusing existing instance");
    handler();
  });
}
