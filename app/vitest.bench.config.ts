import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/bench/**/*.bench.ts"],
  },
  benchmark: {
    include: ["test/bench/**/*.bench.ts"],
    time: 1000,
    iterations: 20,
  },
});
