import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseMoney, parseMinorUnits } from "../../src/core/steamPrice";
import { parseBuyOrderLevels } from "../../src/main/services/steamBuyOrderApi";

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

  it("parses buy order quantity from histogram table", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: 1,
        highest_buy_order: "300",
        buy_order_price: "$3.00",
        buy_order_table: [{ price: "$3.00", quantity: "2" }],
      }),
    });

    const { fetchSteamBuyOrder } = await import("../../src/main/services/steamBuyOrderApi");
    const result = await fetchSteamBuyOrder(123, "Iron Ingot", "USD");

    expect(result.ok).toBe(true);
    expect(result.buyOrderQuantity).toBe(2);
    expect(result.buyOrderLevels).toEqual([{ price: 3, quantity: 2 }]);
  });

  it("parses multiple levels from histogram table, sorted by price", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: 1,
        highest_buy_order: "300",
        buy_order_price: "$3.00",
        buy_order_table: [
          { price: "$3.00", quantity: "2" },
          { price: "$2.50", quantity: "10" },
          { price: "$1.00", quantity: "100" },
        ],
      }),
    });

    const { fetchSteamBuyOrder } = await import("../../src/main/services/steamBuyOrderApi");
    const result = await fetchSteamBuyOrder(123, "Iron Ingot", "USD");

    expect(result.buyOrderLevels).toEqual([
      { price: 3, quantity: 2 },
      { price: 2.5, quantity: 10 },
      { price: 1, quantity: 100 },
    ]);
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

describe("parseBuyOrderLevels", () => {
  it("reads levels from buy_order_table, sorted descending by price", () => {
    expect(
      parseBuyOrderLevels({
        buy_order_table: [{ price: "$1.00", quantity: "3" }],
      }),
    ).toEqual([{ price: 1, quantity: 3 }]);
  });

  it("falls back to differencing cumulative buy_order_graph quantities", () => {
    // Steam's buy_order_graph is cumulative going down in price: the point at
    // 1.5 (best price) has 2 units, and the point at 1.0 has 5 units total
    // cumulative — i.e. 3 more units become available once you accept 1.0.
    expect(
      parseBuyOrderLevels({
        buy_order_graph: [
          [1.0, 5, ""],
          [1.5, 2, ""],
        ],
      }),
    ).toEqual([
      { price: 1.5, quantity: 2 },
      { price: 1.0, quantity: 3 },
    ]);
  });
});
