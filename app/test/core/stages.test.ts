import { describe, it, expect } from "vitest";
import { stageName } from "../../src/core/stages";

describe("stageName", () => {
  it("decodes difficulty/act/stage", () => {
    expect(stageName(3205)).toBe("Hell 2-5");
    expect(stageName(2309)).toBe("Nightmare 3-9");
    expect(stageName(1101)).toBe("Normal 1-1");
    expect(stageName(4510)).toBe("Torment 5-10");
  });

  it("appends the wave when given", () => {
    expect(stageName(2309, 7)).toBe("Nightmare 3-9 (w7)");
    expect(stageName(2309, 0)).toBe("Nightmare 3-9");
  });

  it("handles unknown/invalid keys", () => {
    expect(stageName(0)).toBe("?");
    expect(stageName(-5)).toBe("?");
    expect(stageName(9101)).toBe("D9 1-1");
  });
});
