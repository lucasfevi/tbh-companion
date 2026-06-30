import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { LookupItem, LookupPriceSnapshot } from "../../shared/types";

let priceStatus: { currency: string } | undefined;
vi.mock("../../src/renderer/lib/usePrices", () => ({
  usePriceStatus: () => priceStatus,
}));

function snapshot(
  generatedUtc: string,
  prices: Record<string, number | null>,
): LookupPriceSnapshot {
  return { schemaVersion: 1, generatedUtc, baseCurrency: "USD", prices, fx: { USD: 1, BRL: 5 } };
}

const item = {
  name: "Ancient Ember",
  grade: "EPIC",
  type: "MATERIAL",
  marketTradable: true,
} as LookupItem;

beforeEach(() => {
  vi.resetModules();
  priceStatus = { currency: "USD" };
});

describe("useLookupPrices", () => {
  it("fetches the snapshot once, subscribes once, and resolves a priced item", async () => {
    const getLookupPrices = vi.fn().mockResolvedValue(snapshot("g1", { "Ancient Ember": 2 }));
    const onLookupPrices = vi.fn().mockReturnValue(() => {});
    window.tbh = { getLookupPrices, onLookupPrices } as unknown as typeof window.tbh;

    const { useLookupPrices } = await import("../../src/renderer/lib/useLookupPrices");
    const { result: a } = renderHook(() => useLookupPrices());
    const { result: b } = renderHook(() => useLookupPrices());

    await waitFor(() => expect(a.current.resolve(item).state).toBe("priced"));

    expect(getLookupPrices).toHaveBeenCalledTimes(1);
    expect(onLookupPrices).toHaveBeenCalledTimes(1);
    expect(a.current.generatedUtc).toBe("g1");
    expect(b.current.resolve(item).display).toBe("$2.00");
  });

  it("re-resolves through the latest pushed snapshot", async () => {
    let push: ((next: LookupPriceSnapshot | null) => void) | undefined;
    window.tbh = {
      getLookupPrices: vi.fn().mockResolvedValue(snapshot("g1", { "Ancient Ember": 2 })),
      onLookupPrices: vi.fn().mockImplementation((cb) => {
        push = cb;
        return () => {};
      }),
    } as unknown as typeof window.tbh;

    const { useLookupPrices } = await import("../../src/renderer/lib/useLookupPrices");
    const { result } = renderHook(() => useLookupPrices());

    await waitFor(() => expect(result.current.generatedUtc).toBe("g1"));

    act(() => push?.(snapshot("g2", { "Ancient Ember": 4 })));

    await waitFor(() => expect(result.current.generatedUtc).toBe("g2"));
    expect(result.current.resolve(item).display).toBe("$4.00");
  });

  it("re-resolves in the current currency without a re-fetch", async () => {
    window.tbh = {
      getLookupPrices: vi.fn().mockResolvedValue(snapshot("g1", { "Ancient Ember": 2 })),
      onLookupPrices: vi.fn().mockReturnValue(() => {}),
    } as unknown as typeof window.tbh;

    const { useLookupPrices } = await import("../../src/renderer/lib/useLookupPrices");
    priceStatus = { currency: "BRL" };
    const { result } = renderHook(() => useLookupPrices());

    await waitFor(() => expect(result.current.resolve(item).display).toBe("R$ 10,00"));
  });
});
