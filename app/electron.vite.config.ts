import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";

// electron-vite auto-detects entries:
//   main    -> src/main/index.ts
//   preload -> src/preload/index.ts
//   renderer-> src/renderer/index.html (root: src/renderer)
export default defineConfig({
  main: { build: { sourcemap: false } },
  preload: { build: { sourcemap: false } },
  renderer: {
    plugins: [react()],
    build: { sourcemap: false },
  },
});
