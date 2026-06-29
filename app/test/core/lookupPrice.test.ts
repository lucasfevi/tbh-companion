import { describe, it, expect } from "vitest";
import type { GameItem } from "../../src/core/gamedata";
import {
  assembleSnapshot,
  buildSnapshot,
  priceableHashes,
  resolveLookupPrice,
  sweepListedPrices,
  type ListedResult,
  type PriceState,
} from "../../src/core/lookupPrice";
import type { LookupPriceSnapshot } from "../../shared/types";

function item(partial: Partial<GameItem> & Pick<GameItem, "name" | "grade" | "type">): GameItem {
  return { id: 1, level: null, marketTradable: true, ...partial };
}

const noSleep = (): Promise<void> => Promise.resolve();
const NOW = Date.parse("2026-06-29T00:00:00.000Z");
const NOW_ISO = "2026-06-29T00:00:00.000Z";
const empty = (): PriceState => ({ prices: {}, fetchedUtc: {} });

describe("priceableHashes", () => {
  it("includes tradable materials by display name", () => {
    const hashes = priceableHashes([
      item({ name: "Ancient Ember", grade: "EPIC", type: "MATERIAL" }),
    ]);
    expect(hashes).toContain("Ancient Ember");
  });

  it("includes Legendary+ gear as '<name> (<Grade>) A'", () => {
    const hashes = priceableHashes([
      item({ name: "Knight Boots", grade: "LEGENDARY", type: "GEAR" }),
    ]);
    expect(hashes).toContain("Knight Boots (Legendary) A");
  });

  it("excludes gear below Legendary", () => {
    const hashes = priceableHashes([item({ name: "Knight Boots", grade: "RARE", type: "GEAR" })]);
    expect(hashes).toEqual([]);
  });

  it("excludes non-tradable items", () => {
    const hashes = priceableHashes([
      item({ name: "Bound Gem", grade: "EPIC", type: "MATERIAL", marketTradable: false }),
    ]);
    expect(hashes).toEqual([]);
  });

  it("deduplicates repeated hashes", () => {
    const hashes = priceableHashes([
      item({ name: "Ancient Ember", grade: "EPIC", type: "MATERIAL" }),
      item({ name: "Ancient Ember", grade: "EPIC", type: "MATERIAL", id: 2 }),
    ]);
    expect(hashes).toEqual(["Ancient Ember"]);
  });
});

describe("buildSnapshot", () => {
  it("emits the v1 snapshot shape with USD base, timestamps, and passthrough prices/fx", () => {
    const snap = buildSnapshot({
      prices: { "Ancient Ember": 1.23, "Knight Boots (Legendary) A": null },
      fetchedUtc: { "Ancient Ember": "2026-06-28T00:00:00.000Z" },
      fx: { BRL: 5.1 },
      now: () => NOW,
    });
    expect(snap.schemaVersion).toBe(1);
    expect(snap.baseCurrency).toBe("USD");
    expect(snap.generatedUtc).toBe(NOW_ISO);
    expect(snap.prices).toEqual({ "Ancient Ember": 1.23, "Knight Boots (Legendary) A": null });
    expect(snap.fetchedUtc).toEqual({ "Ancient Ember": "2026-06-28T00:00:00.000Z" });
    expect(snap.fx).toEqual({ BRL: 5.1 });
  });
});

describe("sweepListedPrices", () => {
  it("prices missing hashes and stamps fetchedUtc", async () => {
    const responses: Record<string, ListedResult> = {
      A: { ok: true, usd: 2.5 },
      B: { ok: true, usd: null },
    };
    const result = await sweepListedPrices(["A", "B"], empty(), {
      fetchListedUsd: (hash) => Promise.resolve(responses[hash]),
      sleep: noSleep,
      baseDelayMs: 0,
      now: () => NOW,
    });
    expect(result.prices).toEqual({ A: 2.5, B: null });
    expect(result.fetchedUtc).toEqual({ A: NOW_ISO, B: NOW_ISO });
  });

  it("fetches missing hashes before re-pricing stale ones", async () => {
    const fetched: string[] = [];
    const prior: PriceState = { prices: { A: 1 }, fetchedUtc: { A: "2020-01-01T00:00:00.000Z" } };
    await sweepListedPrices(["A", "B"], prior, {
      fetchListedUsd: (hash) => {
        fetched.push(hash);
        return Promise.resolve({ ok: true, usd: 1 });
      },
      sleep: noSleep,
      baseDelayMs: 0,
      now: () => NOW,
      minRefreshAgeMs: 0,
    });
    expect(fetched).toEqual(["B", "A"]);
  });

  it("re-prices existing hashes oldest-first", async () => {
    const fetched: string[] = [];
    const prior: PriceState = {
      prices: { A: 1, B: 2 },
      fetchedUtc: { A: "2026-06-28T12:00:00.000Z", B: "2026-06-28T00:00:00.000Z" },
    };
    await sweepListedPrices(["A", "B"], prior, {
      fetchListedUsd: (hash) => {
        fetched.push(hash);
        return Promise.resolve({ ok: true, usd: 9 });
      },
      sleep: noSleep,
      baseDelayMs: 0,
      now: () => NOW,
      minRefreshAgeMs: 0,
    });
    expect(fetched).toEqual(["B", "A"]);
  });

  it("skips already-priced hashes younger than the minimum refresh age", async () => {
    const fetched: string[] = [];
    const prior: PriceState = {
      prices: { A: 1 },
      fetchedUtc: { A: new Date(NOW - 1000).toISOString() },
    };
    const result = await sweepListedPrices(["A"], prior, {
      fetchListedUsd: (hash) => {
        fetched.push(hash);
        return Promise.resolve({ ok: true, usd: 5 });
      },
      sleep: noSleep,
      baseDelayMs: 0,
      now: () => NOW,
      minRefreshAgeMs: 60_000,
    });
    expect(fetched).toEqual([]);
    expect(result.prices).toEqual({ A: 1 });
  });

  it("backs off and retries the same hash on a rate limit, with growing delay", async () => {
    const sleeps: number[] = [];
    let calls = 0;
    const result = await sweepListedPrices(["A"], empty(), {
      fetchListedUsd: () => {
        calls += 1;
        if (calls <= 2) return Promise.resolve({ ok: false, rateLimited: true });
        return Promise.resolve({ ok: true, usd: 3 });
      },
      sleep: (ms) => {
        sleeps.push(ms);
        return Promise.resolve();
      },
      baseDelayMs: 10,
      maxDelayMs: 1000,
      now: () => NOW,
    });
    expect(result.prices).toEqual({ A: 3 });
    expect(sleeps.slice(0, 2)).toEqual([20, 40]);
  });

  it("stops the sweep after N consecutive rate limits (quota spent)", async () => {
    const fetched: string[] = [];
    const result = await sweepListedPrices(["A", "B", "C", "D"], empty(), {
      fetchListedUsd: (hash) => {
        fetched.push(hash);
        return Promise.resolve({ ok: false, rateLimited: true });
      },
      sleep: noSleep,
      baseDelayMs: 0,
      now: () => NOW,
      maxConsecutiveRateLimits: 3,
    });
    expect(fetched).toEqual(["A", "A", "A"]);
    expect(result.prices).toEqual({});
  });

  it("resets the consecutive-rate-limit counter after a success", async () => {
    const responses: ListedResult[] = [
      { ok: false, rateLimited: true },
      { ok: true, usd: 7 },
      { ok: false, rateLimited: true },
      { ok: true, usd: 8 },
    ];
    let call = 0;
    const result = await sweepListedPrices(["A", "B"], empty(), {
      fetchListedUsd: () => Promise.resolve(responses[call++]),
      sleep: noSleep,
      baseDelayMs: 0,
      now: () => NOW,
      maxConsecutiveRateLimits: 2,
    });
    expect(result.prices).toEqual({ A: 7, B: 8 });
  });

  it("reports progress after each newly-priced hash for incremental persistence", async () => {
    const states: Array<Record<string, number | null>> = [];
    await sweepListedPrices(["A", "B"], empty(), {
      fetchListedUsd: (hash) => Promise.resolve({ ok: true, usd: hash === "A" ? 1 : 2 }),
      sleep: noSleep,
      baseDelayMs: 0,
      now: () => NOW,
      onProgress: (state) => states.push({ ...state.prices }),
    });
    expect(states).toEqual([{ A: 1 }, { A: 1, B: 2 }]);
  });

  it("leaves errored (non-rate-limited) missing hashes absent so the next run retries", async () => {
    const result = await sweepListedPrices(["A"], empty(), {
      fetchListedUsd: () => Promise.resolve({ ok: false, rateLimited: false }),
      sleep: noSleep,
      baseDelayMs: 0,
      now: () => NOW,
    });
    expect(result.prices).toEqual({});
    expect("A" in result.prices).toBe(false);
  });
});

describe("assembleSnapshot", () => {
  const items = [
    item({ name: "Ancient Ember", grade: "EPIC", type: "MATERIAL" }),
    item({ name: "Knight Boots", grade: "LEGENDARY", type: "GEAR", id: 2 }),
  ];

  it("builds a snapshot from injected price + FX fetchers, stamping timestamps", async () => {
    const prices: Record<string, number | null> = {
      "Ancient Ember": 1.5,
      "Knight Boots (Legendary) A": null,
    };
    const snap = await assembleSnapshot(items, {
      fetchListedUsd: (hash) => Promise.resolve({ ok: true, usd: prices[hash] ?? null }),
      fetchFxRates: () => Promise.resolve({ BRL: 5.1, EUR: 0.92 }),
      sleep: noSleep,
      baseDelayMs: 0,
      now: () => NOW,
    });
    expect(snap.prices).toEqual({ "Ancient Ember": 1.5, "Knight Boots (Legendary) A": null });
    expect(snap.fetchedUtc?.["Ancient Ember"]).toBe(NOW_ISO);
    expect(snap.fx).toEqual({ BRL: 5.1, EUR: 0.92 });
    expect(snap.generatedUtc).toBe(NOW_ISO);
  });

  it("falls back to prior FX when the FX fetch fails", async () => {
    const snap = await assembleSnapshot(items, {
      fetchListedUsd: () => Promise.resolve({ ok: true, usd: 1 }),
      fetchFxRates: () => Promise.reject(new Error("network")),
      sleep: noSleep,
      baseDelayMs: 0,
      resumeFx: { BRL: 4.8 },
    });
    expect(snap.fx).toEqual({ BRL: 4.8 });
  });
});

describe("resolveLookupPrice", () => {
  const snap: LookupPriceSnapshot = {
    schemaVersion: 1,
    generatedUtc: "2026-06-29T00:00:00Z",
    baseCurrency: "USD",
    prices: {
      "Ancient Ember": 2,
      "Knight Boots (Legendary) A": null, // tradable, no active listing
    },
    fx: { USD: 1, BRL: 5 },
  };
  const material = item({ name: "Ancient Ember", grade: "EPIC", type: "MATERIAL" });
  const gear = item({ name: "Knight Boots", grade: "LEGENDARY", type: "GEAR" });

  it("prices a material in USD with a listing URL", () => {
    const r = resolveLookupPrice(material, snap, "USD");
    expect(r.state).toBe("priced");
    expect(r.usd).toBe(2);
    expect(r.amount).toBe(2);
    expect(r.display).toBe("$2.00");
    expect(r.hash).toBe("Ancient Ember");
    expect(r.listingUrl).toContain("Ancient%20Ember");
  });

  it("converts to the display currency via the FX rate", () => {
    const r = resolveLookupPrice(material, snap, "BRL");
    expect(r.amount).toBe(10);
    expect(r.display).toBe("R$ 10,00");
  });

  it("falls back to USD display when the currency has no FX rate", () => {
    const r = resolveLookupPrice(material, snap, "JPY");
    expect(r.amount).toBe(2);
    expect(r.display).toBe("$2.00");
  });

  it("returns no-listing for a tradable item with a null snapshot price", () => {
    const r = resolveLookupPrice(gear, snap, "USD");
    expect(r.state).toBe("no-listing");
    expect(r.display).toBeNull();
    expect(r.hash).toBe("Knight Boots (Legendary) A");
    expect(r.listingUrl).toContain("Knight%20Boots");
  });

  it("returns no-listing for a tradable item absent from the snapshot", () => {
    const r = resolveLookupPrice(
      item({ name: "Mythic Charm", grade: "EPIC", type: "MATERIAL" }),
      snap,
      "USD",
    );
    expect(r.state).toBe("no-listing");
    expect(r.hash).toBe("Mythic Charm");
  });

  it("returns no-listing (still linkable) when there is no snapshot at all", () => {
    const r = resolveLookupPrice(material, null, "USD");
    expect(r.state).toBe("no-listing");
    expect(r.listingUrl).toContain("Ancient%20Ember");
  });

  it("returns not-tradable for a non-priceable item", () => {
    const r = resolveLookupPrice(
      item({ name: "Knight Boots", grade: "RARE", type: "GEAR" }),
      snap,
      "USD",
    );
    expect(r.state).toBe("not-tradable");
    expect(r.hash).toBeNull();
    expect(r.listingUrl).toBeNull();
  });
});
