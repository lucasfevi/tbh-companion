import { app, Menu, Tray, nativeImage } from "electron";
import { join } from "node:path";

import type { AppServices } from "../app/appState";

let tray: Tray | null = null;
let quitting = false;

export function isAppQuitting(): boolean {
  return quitting;
}

export function setAppQuitting(value = true): void {
  quitting = value;
}

function trayIconPath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, "tray-icon.png");
  }
  return join(app.getAppPath(), "..", "docs", "design", "icons", "concept-companion-512.png");
}

function trayImage() {
  const image = nativeImage.createFromPath(trayIconPath());
  if (image.isEmpty()) return image;
  return image.resize({ width: 16, height: 16 });
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
      label: "Box tracker",
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
