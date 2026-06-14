import { describe, it, expect } from "vitest";
import { boxTrackerSectionOrder } from "../../src/renderer/lib/boxTrackerUi";

describe("boxTrackerSectionOrder", () => {
  it("puts cooldown first by default", () => {
    expect(boxTrackerSectionOrder("cooldown-first")).toEqual(["cooldown", "ready"]);
  });

  it("puts ready first when configured", () => {
    expect(boxTrackerSectionOrder("ready-first")).toEqual(["ready", "cooldown"]);
  });
});
