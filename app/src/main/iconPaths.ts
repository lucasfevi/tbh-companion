import { app, nativeImage, type BrowserWindow } from "electron";
import { join } from "node:path";

const ICON_DIR = join(app.getAppPath(), "..", "docs", "design", "icons");

function packagedIcon(name: string): string {
  return join(process.resourcesPath, name);
}

function devIcon(name: string): string {
  return join(ICON_DIR, name);
}

export function appIconPath(): string {
  const name = "companion-icon-256.png";
  return app.isPackaged ? packagedIcon(name) : devIcon(name);
}

export function trayIconPath(): string {
  const name = "tray-icon-32.png";
  if (app.isPackaged) {
    return packagedIcon(name);
  }
  return devIcon(name);
}

export function setWindowIcon(win: BrowserWindow): void {
  const image = nativeImage.createFromPath(appIconPath());
  if (!image.isEmpty()) {
    win.setIcon(image);
  }
}

export function trayImage() {
  const image = nativeImage.createFromPath(trayIconPath());
  if (image.isEmpty()) return image;
  return image.resize({ width: 16, height: 16 });
}
