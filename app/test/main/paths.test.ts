import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("main paths", () => {
  it("uses bundle-root relative preload and renderer paths", () => {
    const paths = readFileSync(join(__dirname, "../../src/main/paths.ts"), "utf-8");
    expect(paths).toContain('../preload/index.js');
    expect(paths).toContain('../renderer/index.html');
    expect(paths).not.toContain("../../preload");
  });
});
