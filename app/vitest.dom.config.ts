import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./test/renderer-component/setup.ts"],
    include: [
      "test/renderer-component/**/*.test.{ts,tsx}",
      "src/renderer/design-system/**/*.test.tsx",
    ],
  },
});
