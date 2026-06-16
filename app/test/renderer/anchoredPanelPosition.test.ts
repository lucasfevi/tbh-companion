import { describe, expect, it } from "vitest";
import { clampPanelPosition } from "../../src/renderer/lib/anchoredPanelPosition";

describe("clampPanelPosition", () => {
  it("keeps panel inside left edge when trigger is flush left", () => {
    const pos = clampPanelPosition({ top: 100, right: 72, bottom: 124 }, 200, 280, 900, 640);
    expect(pos.left).toBe(8);
    expect(pos.top).toBe(128);
  });

  it("flips above trigger when panel would overflow bottom", () => {
    const pos = clampPanelPosition({ top: 500, right: 400, bottom: 524 }, 200, 280, 900, 640);
    expect(pos.top).toBe(216);
  });
});
