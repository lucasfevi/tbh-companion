import { resolve } from "node:path";
import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// electron-vite auto-detects entries:
//   main    -> src/main/index.ts
//   preload -> src/preload/index.ts
//   renderer-> src/renderer/index.html (root: src/renderer)
//
// The live-memory reader is built as a second main-process entry so it can be
// spawned as an isolated utilityProcess (out/main/liveMemoryWorker.js).
export default defineConfig({
  main: {
    build: {
      sourcemap: false,
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/main/index.ts"),
          liveMemoryWorker: resolve(__dirname, "src/main/liveMemory/worker.ts"),
        },
      },
    },
  },
  preload: { build: { sourcemap: false } },
  renderer: {
    plugins: [tailwindcss(), react()],
    build: { sourcemap: false },
  },
});
