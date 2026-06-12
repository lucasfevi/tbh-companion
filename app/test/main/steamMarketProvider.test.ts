import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

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

import { SteamMarketProvider } from "../../src/main/steamMarketProvider";
import { priceCachePath } from "../../src/main/services/priceCache";

const entry = {
  lowest: 1,
  median: 2,
  volume: 0,
  rawLowest: "$1",
  rawMedian: "$2",
  fetchedUtc: new Date().toISOString(),
};

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
    names: string[],
    opts: { force?: boolean; onFinished?: (r: unknown) => void } = {},
  ) {
    const promise = provider.refresh(names, opts);
    await vi.runAllTimersAsync();
    return promise;
  }

  it("prunes orphan cache entries and persists", async () => {
    fetchSteamPrice.mockResolvedValue({ ok: true, status: 200, entry });

    const provider = new SteamMarketProvider("USD");
    expect(provider.pruneCache(["Item A"])).toBe(0);

    await runRefresh(provider, ["Item A", "Item B"], { force: true });

    const removedOrphans = provider.pruneCache(["Item A"]);
    expect(removedOrphans).toBe(1);
    const raw = JSON.parse(readFileSync(priceCachePath("USD"), "utf-8")) as {
      prices: Record<string, unknown>;
    };
    expect(Object.keys(raw.prices)).toEqual(["Item A"]);
  });

  it("short-circuits when all targets are fresh", async () => {
    fetchSteamPrice.mockResolvedValue({ ok: true, status: 200, entry });

    const provider = new SteamMarketProvider("USD");
    await runRefresh(provider, ["Fresh Item"], { force: true });

    const onFinished = vi.fn();
    const result = await runRefresh(provider, ["Fresh Item"], { onFinished });

    expect(result.noop).toBe(true);
    expect(result.skipped).toBe(1);
    expect(fetchSteamPrice).toHaveBeenCalledTimes(1);
    expect(onFinished).toHaveBeenCalledWith(expect.objectContaining({ noop: true }));
  });

  it("reports owned target counts in status", async () => {
    fetchSteamPrice.mockResolvedValue({ ok: true, status: 200, entry });

    const provider = new SteamMarketProvider("USD");
    await runRefresh(provider, ["A"], { force: true });

    const status = provider.status(["A", "B"]);
    expect(status.ownedTargets).toBe(2);
    expect(status.freshCount).toBe(1);
    expect(status.staleCount).toBe(1);
  });

  it("continues after fetch timeout (status 0)", async () => {
    fetchSteamPrice
      .mockResolvedValueOnce({ ok: false, status: 0 })
      .mockResolvedValueOnce({ ok: true, status: 200, entry });

    const provider = new SteamMarketProvider("USD");
    const result = await runRefresh(provider, ["A", "B"], { force: true });

    expect(result.failed).toBe(1);
    expect(result.priced).toBe(1);
    expect(fetchSteamPrice).toHaveBeenCalledTimes(2);
  });
});
