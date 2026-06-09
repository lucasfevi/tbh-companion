import { join } from "node:path";

// electron-vite bundles main into out/main/index.js, so __dirname is always
// out/main/ — not the source subfolder (windows/, etc.).
export const PRELOAD_SCRIPT = join(__dirname, "../preload/index.js");
export const RENDERER_HTML = join(__dirname, "../renderer/index.html");
