import { describe, it, expect } from "vitest";
import type { GameItem } from "../../src/core/gamedata";
import {
  assembleSnapshot,
  buildSnapshot,
  priceableHashes,
  sweepListedPrices,
  type ListedResult,
} from "../../src/core/lookupPrice";

function item(partial: Partial<GameItem> & Pick<GameItem, "name" | "grade" | "type">): GameItem {
  return { id: 1, level: null, marketTradable: true, ...partial };
}

const noSleep = (): Promise<void> => Promise.resolve();

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
  it("emits the v1 snapshot shape with USD base and passthrough prices/fx", () => {
    const snap = buildSnapshot({
      prices: { "Ancient Ember": 1.23, "Knight Boots (Legendary) A": null },
      fx: { BRL: 5.1 },
      now: () => "2026-06-29T00:00:00.000Z",
    });
    expect(snap.schemaVersion).toBe(1);
    expect(snap.baseCurrency).toBe("USD");
    expect(snap.generatedUtc).toBe("2026-06-29T00:00:00.000Z");
    expect(snap.prices).toEqual({ "Ancient Ember": 1.23, "Knight Boots (Legendary) A": null });
    expect(snap.fx).toEqual({ BRL: 5.1 });
  });
});

describe("sweepListedPrices", () => {
  it("records USD values and null for no active listing", async () => {
    const responses: Record<string, ListedResult> = {
      A: { ok: true, usd: 2.5 },
      B: { ok: true, usd: null },
    };
    const result = await sweepListedPrices(
      ["A", "B"],
      {},
      {
        fetchListedUsd: (hash) => Promise.resolve(responses[hash]),
        sleep: noSleep,
        baseDelayMs: 0,
      },
    );
    expect(result).toEqual({ A: 2.5, B: null });
  });

  it("skips hashes already priced in a prior run (resume)", async () => {
    const fetched: string[] = [];
    const result = await sweepListedPrices(
      ["A", "B"],
      { A: 9.99 },
      {
        fetchListedUsd: (hash) => {
          fetched.push(hash);
          return Promise.resolve({ ok: true, usd: 1 });
        },
        sleep: noSleep,
        baseDelayMs: 0,
      },
    );
    expect(fetched).toEqual(["B"]);
    expect(result).toEqual({ A: 9.99, B: 1 });
  });

  it("backs off and retries the same hash on a rate limit, with growing delay", async () => {
    const sleeps: number[] = [];
    let calls = 0;
    const result = await sweepListedPrices(
      ["A"],
      {},
      {
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
      },
    );
    expect(result).toEqual({ A: 3 });
    const backoffSleeps = sleeps.slice(0, 2);
    expect(backoffSleeps).toEqual([20, 40]);
  });

  it("stops the sweep after N consecutive rate limits (quota spent)", async () => {
    const fetched: string[] = [];
    const result = await sweepListedPrices(
      ["A", "B", "C", "D"],
      {},
      {
        fetchListedUsd: (hash) => {
          fetched.push(hash);
          return Promise.resolve({ ok: false, rateLimited: true });
        },
        sleep: noSleep,
        baseDelayMs: 0,
        maxConsecutiveRateLimits: 3,
      },
    );
    // 3 consecutive rate limits on "A" trip the breaker before reaching B/C/D.
    expect(fetched).toEqual(["A", "A", "A"]);
    expect(result).toEqual({});
  });

  it("resets the consecutive-rate-limit counter after a success", async () => {
    const responses: ListedResult[] = [
      { ok: false, rateLimited: true },
      { ok: true, usd: 7 }, // resets the counter
      { ok: false, rateLimited: true },
      { ok: true, usd: 8 },
    ];
    let call = 0;
    const result = await sweepListedPrices(
      ["A", "B"],
      {},
      {
        fetchListedUsd: () => Promise.resolve(responses[call++]),
        sleep: noSleep,
        baseDelayMs: 0,
        maxConsecutiveRateLimits: 2,
      },
    );
    // Without the reset, the 2nd isolated rate limit would have tripped the breaker.
    expect(result).toEqual({ A: 7, B: 8 });
  });

  it("reports progress after each newly-priced hash for incremental persistence", async () => {
    const snapshots: Array<Record<string, number | null>> = [];
    await sweepListedPrices(
      ["A", "B"],
      {},
      {
        fetchListedUsd: (hash) => Promise.resolve({ ok: true, usd: hash === "A" ? 1 : 2 }),
        sleep: noSleep,
        baseDelayMs: 0,
        onProgress: (priced) => snapshots.push({ ...priced }),
      },
    );
    expect(snapshots).toEqual([{ A: 1 }, { A: 1, B: 2 }]);
  });

  it("leaves errored (non-rate-limited) hashes absent so the next run retries", async () => {
    const result = await sweepListedPrices(
      ["A"],
      {},
      {
        fetchListedUsd: () => Promise.resolve({ ok: false, rateLimited: false }),
        sleep: noSleep,
        baseDelayMs: 0,
      },
    );
    expect(result).toEqual({});
    expect("A" in result).toBe(false);
  });
});

describe("assembleSnapshot", () => {
  const items = [
    item({ name: "Ancient Ember", grade: "EPIC", type: "MATERIAL" }),
    item({ name: "Knight Boots", grade: "LEGENDARY", type: "GEAR", id: 2 }),
  ];

  it("builds a snapshot from injected price + FX fetchers", async () => {
    const prices: Record<string, number | null> = {
      "Ancient Ember": 1.5,
      "Knight Boots (Legendary) A": null,
    };
    const snap = await assembleSnapshot(items, {
      fetchListedUsd: (hash) => Promise.resolve({ ok: true, usd: prices[hash] ?? null }),
      fetchFxRates: () => Promise.resolve({ BRL: 5.1, EUR: 0.92 }),
      sleep: noSleep,
      baseDelayMs: 0,
      now: () => "2026-06-29T00:00:00.000Z",
    });
    expect(snap.prices).toEqual({ "Ancient Ember": 1.5, "Knight Boots (Legendary) A": null });
    expect(snap.fx).toEqual({ BRL: 5.1, EUR: 0.92 });
    expect(snap.schemaVersion).toBe(1);
    expect(snap.generatedUtc).toBe("2026-06-29T00:00:00.000Z");
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
