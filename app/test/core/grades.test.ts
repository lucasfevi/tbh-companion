import { describe, it, expect } from "vitest";

import { gradeForTier } from "../../src/core/grades";

describe("gradeForTier", () => {
  it("maps T1 to COMMON and T10 to COSMIC", () => {
    expect(gradeForTier(1)).toBe("COMMON");
    expect(gradeForTier(10)).toBe("COSMIC");
  });

  it("maps out-of-range tiers to UNKNOWN", () => {
    expect(gradeForTier(0)).toBe("UNKNOWN");
    expect(gradeForTier(11)).toBe("UNKNOWN");
  });
});
