import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseMoney, parseMinorUnits } from "../../src/core/steamPrice";

const fetchMock = vi.fn();

describe("fetchSteamBuyOrder", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses BRL histogram buy_order_price for Lapis Lazuli", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: 1,
        highest_buy_order: "1400",
        buy_order_price: "R$ 14,00",
      }),
    });

    const { fetchSteamBuyOrder } = await import("../../src/main/services/steamBuyOrderApi");
    const result = await fetchSteamBuyOrder(176626652, "Lapis Lazuli", "BRL");

    expect(result.ok).toBe(true);
    expect(result.buyOrder).toBeCloseTo(14);
    expect(result.rawBuyOrder).toBe("R$ 14,00");
    expect(parseMoney("R$ 14,00")).toBeCloseTo(14);
    expect(parseMinorUnits("1400")).toBeCloseTo(14);
  });

  it("returns not ok when histogram success code is not 1", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: 104 }),
    });

    const { fetchSteamBuyOrder } = await import("../../src/main/services/steamBuyOrderApi");
    const result = await fetchSteamBuyOrder(99999999, "Lapis Lazuli", "BRL");

    expect(result.ok).toBe(false);
  });
});
