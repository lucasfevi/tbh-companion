import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bench, describe, vi } from "vitest";
import { SteamMarketProvider } from "../../src/main/steamMarketProvider";

const userDataDir = mkdtempSync(join(tmpdir(), "tbh-bench-market-"));

vi.mock("electron", () => ({
  app: {
    getPath: () => userDataDir,
  },
}));

const fetchSteamPrice = vi.fn();

vi.mock("../../src/main/services/steamPriceApi", () => ({
  fetchSteamPrice: (...args: unknown[]) => fetchSteamPrice(...args),
}));

const entry = {
  lowest: 1,
  median: 2,
  volume: 0,
  rawLowest: "$1",
  rawMedian: "$2",
  fetchedUtc: new Date().toISOString(),
};

fetchSteamPrice.mockResolvedValue({ ok: true, status: 200, entry });

const provider = new SteamMarketProvider("USD");
await provider.refresh(["Cached Item"], { force: true });

describe("steam refresh", () => {
  bench("refresh all cached (noop)", async () => {
    await provider.refresh(["Cached Item"], { force: false });
  });
});

process.on("exit", () => {
  rmSync(userDataDir, { recursive: true, force: true });
});
