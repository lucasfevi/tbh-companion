import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// electron-vite auto-detects entries:
//   main    -> src/main/index.ts
//   preload -> src/preload/index.ts
//   renderer-> src/renderer/index.html (root: src/renderer)
export default defineConfig({
  main: { build: { sourcemap: false } },
  preload: { build: { sourcemap: false } },
  renderer: {
    plugins: [tailwindcss(), react()],
    build: { sourcemap: false },
  },
});
