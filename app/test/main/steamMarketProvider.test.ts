import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { OwnedPriceTarget } from "../../src/core/inventory/ownedPriceTargets";

let userDataDir = "";

vi.mock("electron", () => ({
  app: {
    getPath: () => userDataDir,
  },
}));

const fetchSteamPrice = vi.fn();

vi.mock("../../src/main/services/steamPriceApi", () => ({
  fetchSteamPrice: (...args: unknown[]) => fetchSteamPrice(...args),
}));

vi.mock("../../src/main/services/steamBuyOrderApi", () => ({
  fetchSteamBuyOrder: vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    buyOrder: 0.5,
    rawBuyOrder: "$0.50",
  }),
}));

vi.mock("../../src/main/services/steamItemNameId", () => ({
  getSteamItemNameIdService: () => ({
    getSync: () => 12345,
    resolve: vi.fn().mockResolvedValue({ ok: true, nameId: 12345, status: 200 }),
  }),
}));

import { SteamMarketProvider } from "../../src/main/steamMarketProvider";
import { priceCachePath } from "../../src/main/services/priceCache";

const entry = {
  lowest: 1,
  median: 2,
  volume: 0,
  rawLowest: "$1",
  rawMedian: "$2",
  fetchedUtc: new Date().toISOString(),
  buyOrder: null,
  rawBuyOrder: null,
  buyOrderFetched: true,
  buyOrderCheckUtc: new Date().toISOString(),
};

function mat(hash: string): OwnedPriceTarget {
  return { kind: "material", hash };
}

function gear(...candidates: string[]): OwnedPriceTarget {
  return { kind: "gear", candidates };
}

describe("SteamMarketProvider", () => {
  beforeEach(() => {
    userDataDir = mkdtempSync(join(tmpdir(), "tbh-market-"));
    fetchSteamPrice.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    rmSync(userDataDir, { recursive: true, force: true });
  });

  async function runRefresh(
    provider: SteamMarketProvider,
    targets: OwnedPriceTarget[],
    opts: { force?: boolean; onFinished?: (r: unknown) => void } = {},
  ) {
    const promise = provider.refresh(targets, opts);
    await vi.runAllTimersAsync();
    return promise;
  }

  it("prunes orphan cache entries and persists", async () => {
    fetchSteamPrice.mockResolvedValue({ ok: true, status: 200, entry });

    const provider = new SteamMarketProvider("USD");
    expect(provider.pruneCache(["Item A"])).toBe(0);

    await runRefresh(provider, [mat("Item A"), mat("Item B")], { force: true });

    const removedOrphans = provider.pruneCache(["Item A"]);
    expect(removedOrphans).toBe(1);
    const raw = JSON.parse(readFileSync(priceCachePath("USD"), "utf-8")) as {
      prices: Record<string, unknown>;
    };
    expect(Object.keys(raw.prices)).toEqual(["Item A"]);
  });

  it("treats sell-only cache entries as stale until buy histogram succeeds", async () => {
    fetchSteamPrice.mockResolvedValue({ ok: true, status: 200, entry });

    const provider = new SteamMarketProvider("USD");
    const sellOnly = {
      ...entry,
      buyOrderFetched: true,
      buyOrderCheckUtc: undefined,
    };
    provider["cache"].prices["Legacy Item"] = sellOnly;

    expect(provider.isFresh("Legacy Item")).toBe(false);

    const onFinished = vi.fn();
    const result = await runRefresh(provider, [mat("Legacy Item")], { onFinished });

    expect(result.noop).toBeUndefined();
    expect(fetchSteamPrice).toHaveBeenCalledTimes(1);
  });

  it("short-circuits when all targets are fresh", async () => {
    fetchSteamPrice.mockResolvedValue({ ok: true, status: 200, entry });

    const provider = new SteamMarketProvider("USD");
    await runRefresh(provider, [mat("Fresh Item")], { force: true });

    const onFinished = vi.fn();
    const result = await runRefresh(provider, [mat("Fresh Item")], { onFinished });

    expect(result.noop).toBe(true);
    expect(result.skipped).toBe(1);
    expect(fetchSteamPrice).toHaveBeenCalledTimes(1);
    expect(onFinished).toHaveBeenCalledWith(expect.objectContaining({ noop: true }));
  });

  it("reports owned target counts in status", async () => {
    fetchSteamPrice.mockResolvedValue({ ok: true, status: 200, entry });

    const provider = new SteamMarketProvider("USD");
    await runRefresh(provider, [mat("A")], { force: true });

    const status = provider.status([mat("A"), mat("B")]);
    expect(status.ownedTargets).toBe(2);
    expect(status.freshCount).toBe(1);
    expect(status.staleCount).toBe(1);
  });

  it("continues after fetch timeout (status 0)", async () => {
    fetchSteamPrice
      .mockResolvedValueOnce({ ok: false, status: 0 })
      .mockResolvedValueOnce({ ok: true, status: 200, entry });

    const provider = new SteamMarketProvider("USD");
    const result = await runRefresh(provider, [mat("A"), mat("B")], { force: true });

    expect(result.failed).toBe(1);
    expect(result.priced).toBe(1);
    expect(fetchSteamPrice).toHaveBeenCalledTimes(2);
  });

  it("stops gear variant probe after first priced letter", async () => {
    fetchSteamPrice.mockResolvedValue({ ok: true, status: 200, entry });

    const provider = new SteamMarketProvider("USD");
    await runRefresh(
      provider,
      [gear("Sword (Legendary) A", "Sword (Legendary) B", "Sword (Legendary) C")],
      { force: true },
    );

    expect(fetchSteamPrice).toHaveBeenCalledTimes(1);
    expect(fetchSteamPrice).toHaveBeenCalledWith("Sword (Legendary) A", "USD");
  });

  it("tries next gear variant when earlier has no listing", async () => {
    fetchSteamPrice
      .mockResolvedValueOnce({ ok: false, status: 200 })
      .mockResolvedValueOnce({ ok: true, status: 200, entry });

    const provider = new SteamMarketProvider("USD");
    const result = await runRefresh(
      provider,
      [gear("Sword (Legendary) A", "Sword (Legendary) B")],
      { force: true },
    );

    expect(result.priced).toBe(1);
    expect(fetchSteamPrice).toHaveBeenCalledTimes(2);
    expect(fetchSteamPrice).toHaveBeenNthCalledWith(1, "Sword (Legendary) A", "USD");
    expect(fetchSteamPrice).toHaveBeenNthCalledWith(2, "Sword (Legendary) B", "USD");
  });
});
