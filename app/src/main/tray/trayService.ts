import { app, Menu, Tray } from "electron";

import type { AppServices } from "../app/appState";
import { trayImage } from "../iconPaths";

let tray: Tray | null = null;
let quitting = false;

export function isAppQuitting(): boolean {
  return quitting;
}

export function setAppQuitting(value = true): void {
  quitting = value;
}

export function createTray(services: AppServices): Tray {
  if (tray && !tray.isDestroyed()) return tray;

  tray = new Tray(trayImage());
  tray.setToolTip("TBH Companion");

  const menu = Menu.buildFromTemplate([
    {
      label: "Show",
      click: () => {
        services.showMain();
      },
    },
    {
      label: "Mini overlay",
      click: () => {
        services.openOverlay();
      },
    },
    {
      label: "Stage boss chest tracker",
      click: () => {
        services.openBoxTracker();
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        setAppQuitting(true);
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(menu);
  tray.on("double-click", () => {
    services.showMain();
  });

  return tray;
}

export function destroyTray(): void {
  if (tray && !tray.isDestroyed()) {
    tray.destroy();
  }
  tray = null;
}
