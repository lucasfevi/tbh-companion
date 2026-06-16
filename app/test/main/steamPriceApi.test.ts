import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { describeSteamPriceFailure, fetchSteamPrice } from "../../src/main/services/steamPriceApi";

describe("fetchSteamPrice", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          lowest_price: "$0.04",
          median_price: "$0.05",
          volume: "12",
        }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns sell prices on success", async () => {
    const result = await fetchSteamPrice("Iron Ingot", "USD");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.entry.median).toBeCloseTo(0.05);
      expect(result.entry.lowest).toBeCloseTo(0.04);
    }
  });

  it("reports no_listing when Steam success is false", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: false }),
    } as Response);

    const result = await fetchSteamPrice("Missing Item", "USD");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("no_listing");
      expect(result.entry?.median).toBeNull();
      expect(result.entry?.fetchedUtc).toBeTruthy();
    }
    expect(
      describeSteamPriceFailure(result as { ok: false; status: number; reason: "no_listing" }),
    ).toContain("no Steam market listing");
  });

  it("returns partial entry when success but no sell prices", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, volume: "0" }),
    } as Response);

    const result = await fetchSteamPrice("Buy Only Item", "USD");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("no_sell_price");
      expect(result.entry?.median).toBeNull();
      expect(result.entry?.fetchedUtc).toBeTruthy();
    }
  });

  it("reports network on fetch throw", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("timeout"));

    const result = await fetchSteamPrice("Iron Ingot", "USD");
    expect(result).toEqual({ ok: false, status: 0, reason: "network" });
  });

  it("reports http on non-OK response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({}),
    } as Response);

    const result = await fetchSteamPrice("Iron Ingot", "USD");
    expect(result).toEqual({ ok: false, status: 503, reason: "http" });
  });
});
