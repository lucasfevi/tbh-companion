import { app } from "electron";

import { attachExternalLinkHandlers } from "./app/lifecycle";
import { getAppServices, openMainWindow, startTracking, stopTracking } from "./app/appState";
import { registerIpc } from "./ipc/registerIpc";

app.on("web-contents-created", (_event, contents) => {
  attachExternalLinkHandlers(contents);
});

app.whenReady().then(() => {
  startTracking();
  registerIpc(getAppServices());
  openMainWindow();

  app.on("activate", () => {
    openMainWindow();
  });
});

app.on("window-all-closed", () => {
  stopTracking();
  if (process.platform !== "darwin") app.quit();
});
