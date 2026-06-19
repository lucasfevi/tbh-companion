import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    // test/renderer-component/** runs under vitest.dom.config.ts (jsdom) only —
    // without this, *.test.ts files there (e.g. contrast.test.ts) would run twice.
    exclude: [...configDefaults.exclude, "test/renderer-component/**"],
  },
});
