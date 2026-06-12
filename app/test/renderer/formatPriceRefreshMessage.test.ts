import { describe, it, expect } from "vitest";
import { formatPriceRefreshMessage } from "../../src/renderer/lib/formatPriceRefreshMessage";

describe("formatPriceRefreshMessage", () => {
  it("describes a queued refresh", () => {
    expect(
      formatPriceRefreshMessage({
        ok: true,
        priced: 0,
        skipped: 0,
        failed: 0,
        stopped: "completed",
        queued: true,
      }),
    ).toContain("queued");
  });

  it("describes a no-op when all items are fresh", () => {
    expect(
      formatPriceRefreshMessage({
        ok: true,
        priced: 0,
        skipped: 5,
        failed: 0,
        stopped: "completed",
        noop: true,
      }),
    ).toBe("All 5 items are up to date (updated within 24h). Nothing to fetch.");
  });

  it("describes missing inventory", () => {
    expect(
      formatPriceRefreshMessage({
        ok: true,
        priced: 0,
        skipped: 0,
        failed: 0,
        stopped: "completed",
        ownedTargets: 0,
      }),
    ).toContain("No inventory loaded");
  });

  it("describes a normal completed refresh", () => {
    expect(
      formatPriceRefreshMessage({
        ok: true,
        priced: 2,
        skipped: 3,
        failed: 1,
        stopped: "completed",
      }),
    ).toBe("Priced 2, skipped 3 fresh, 1 failed.");
  });

  it("describes cancellation and failures", () => {
    expect(
      formatPriceRefreshMessage({
        ok: true,
        priced: 0,
        skipped: 0,
        failed: 0,
        stopped: "cancelled",
      }),
    ).toContain("cancelled");
    expect(
      formatPriceRefreshMessage({
        ok: false,
        priced: 0,
        skipped: 0,
        failed: 0,
        stopped: "completed",
        error: "network",
      }),
    ).toContain("Refresh failed");
  });
});
