import { app } from "electron";

import { attachExternalLinkHandlers } from "./app/lifecycle";
import { getAppServices, openMainWindow, startTracking, stopTracking } from "./app/appState";
import { registerIpc } from "./ipc/registerIpc";
import { createTray, destroyTray, isAppQuitting, setAppQuitting } from "./tray/trayService";

app.on("web-contents-created", (_event, contents) => {
  attachExternalLinkHandlers(contents);
});

app.whenReady().then(() => {
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
  setAppQuitting(true);
  destroyTray();
});

app.on("window-all-closed", () => {
  if (isAppQuitting()) {
    stopTracking();
    if (process.platform !== "darwin") app.quit();
  }
});
