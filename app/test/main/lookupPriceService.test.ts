import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LookupPriceService } from "../../src/main/services/LookupPriceService";
import { IPC } from "../../shared/ipc";
import type { LookupPriceSnapshot } from "../../shared/types";

function snapshot(
  generatedUtc: string,
  prices: Record<string, number | null> = { A: 1 },
): LookupPriceSnapshot {
  return { schemaVersion: 1, generatedUtc, baseCurrency: "USD", prices, fx: { USD: 1, BRL: 5 } };
}

function jsonResponse(body: unknown, opts: { status?: number; etag?: string } = {}): Response {
  const headers = new Headers();
  if (opts.etag) headers.set("etag", opts.etag);
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  return new Response(payload, { status: opts.status ?? 200, headers });
}

let dir: string;
let file: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "lookup-prices-"));
  file = join(dir, "lookup_prices.json");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("LookupPriceService.refresh", () => {
  it("stores, persists, and broadcasts a fetched snapshot", async () => {
    const broadcasts: Array<{ channel: string; payload: unknown }> = [];
    const service = new LookupPriceService({
      fetchFn: () => Promise.resolve(jsonResponse(snapshot("2026-06-29T00:00:00Z"))),
      cacheFilePath: () => file,
      broadcastFn: (channel, payload) => broadcasts.push({ channel, payload }),
    });

    await service.refresh();

    expect(service.getSnapshot()?.generatedUtc).toBe("2026-06-29T00:00:00Z");
    expect(existsSync(file)).toBe(true);
    expect(JSON.parse(readFileSync(file, "utf-8")).generatedUtc).toBe("2026-06-29T00:00:00Z");
    expect(broadcasts).toHaveLength(1);
    expect(broadcasts[0].channel).toBe(IPC.LOOKUP_PRICES);
    expect((broadcasts[0].payload as LookupPriceSnapshot).generatedUtc).toBe(
      "2026-06-29T00:00:00Z",
    );
  });

  it("keeps the previous snapshot when a fetched payload is invalid", async () => {
    const responses = [jsonResponse(snapshot("g1")), jsonResponse({ bad: true })];
    let call = 0;
    const broadcasts: string[] = [];
    const service = new LookupPriceService({
      fetchFn: () => Promise.resolve(responses[call++]),
      cacheFilePath: () => file,
      broadcastFn: (channel) => broadcasts.push(channel),
    });

    await service.refresh();
    await service.refresh();

    expect(service.getSnapshot()?.generatedUtc).toBe("g1");
    expect(broadcasts).toHaveLength(1);
  });

  it("treats a 304 response as no change", async () => {
    const responses = [
      jsonResponse(snapshot("g1"), { etag: '"e1"' }),
      new Response(null, { status: 304 }),
    ];
    let call = 0;
    const broadcasts: string[] = [];
    const service = new LookupPriceService({
      fetchFn: () => Promise.resolve(responses[call++]),
      cacheFilePath: () => file,
      broadcastFn: (channel) => broadcasts.push(channel),
    });

    await service.refresh();
    await service.refresh();

    expect(service.getSnapshot()?.generatedUtc).toBe("g1");
    expect(broadcasts).toHaveLength(1);
  });

  it("serves the cached snapshot when the fetch fails (offline)", async () => {
    writeFileSync(file, JSON.stringify(snapshot("disk1")));
    const service = new LookupPriceService({
      fetchFn: () => Promise.reject(new Error("offline")),
      cacheFilePath: () => file,
      broadcastFn: () => {},
    });

    service.reloadFromDisk();
    await service.refresh();

    expect(service.getSnapshot()?.generatedUtc).toBe("disk1");
  });

  it("does not re-broadcast when generatedUtc is unchanged", async () => {
    const responses = [jsonResponse(snapshot("same")), jsonResponse(snapshot("same"))];
    let call = 0;
    const broadcasts: string[] = [];
    const service = new LookupPriceService({
      fetchFn: () => Promise.resolve(responses[call++]),
      cacheFilePath: () => file,
      broadcastFn: (channel) => broadcasts.push(channel),
    });

    await service.refresh();
    await service.refresh();

    expect(broadcasts).toHaveLength(1);
  });
});

describe("LookupPriceService.reloadFromDisk", () => {
  it("clears the snapshot when the cache file is gone", () => {
    writeFileSync(file, JSON.stringify(snapshot("x")));
    const service = new LookupPriceService({ cacheFilePath: () => file });

    service.reloadFromDisk();
    expect(service.getSnapshot()?.generatedUtc).toBe("x");

    rmSync(file);
    service.reloadFromDisk();
    expect(service.getSnapshot()).toBeNull();
  });
});
