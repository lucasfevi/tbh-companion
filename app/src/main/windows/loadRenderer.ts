import { join } from "node:path";

const isDev = !!process.env.ELECTRON_RENDERER_URL;

export function rendererTarget(hash: string): { url?: string; file: string; hash: string } {
  return {
    url: isDev ? `${process.env.ELECTRON_RENDERER_URL}#${hash}` : undefined,
    file: join(__dirname, "../../renderer/index.html"),
    hash,
  };
}

export function loadRenderer(win: Electron.BrowserWindow, hash: string): void {
  const t = rendererTarget(hash);
  if (t.url) {
    win.loadURL(t.url);
  } else {
    win.loadFile(t.file, { hash: t.hash });
  }
}
