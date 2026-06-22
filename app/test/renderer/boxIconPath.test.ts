import { describe, expect, it } from "vitest";
import { boxIconPath } from "../../src/renderer/lib/boxIconPath";

describe("boxIconPath", () => {
  it("maps normal monster box keys to the common category icon", () => {
    expect(boxIconPath(910151)).toBe("item-910011");
    expect(boxIconPath(910201)).toBe("item-910011");
  });

  it("maps stage boss box keys to the rare category icon", () => {
    expect(boxIconPath(920151)).toBe("item-920011");
    expect(boxIconPath(920201)).toBe("item-920011");
  });

  it("maps act boss box keys to the legendary category icon", () => {
    expect(boxIconPath(930201)).toBe("item-930011");
  });

  it("falls back to item-<key> for non-stage-box keys", () => {
    expect(boxIconPath(140002)).toBe("item-140002");
  });
});
