// Build the Lookup price snapshot (USD listed prices + FX) from the bundled
// catalog and publish it as JSON. Runs in CI (GitHub Action) via tsx — the only
// place that hits Steam, so individual clients never do.
//
//   pnpm build:lookup-prices            # full sweep -> prices.json
//   LIMIT=20 pnpm build:lookup-prices   # smoke run over the first 20 hashes
//   OUT=snap.json DELAY_MS=1000 pnpm build:lookup-prices
//
// Resumes from an existing OUT file (prices + fx) so an interrupted/rate-limited
// run continues where it left off on the next invocation.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { assembleSnapshot, buildSnapshot } from "../src/core/lookupPrice";
import { normalizeGameItem, type GameItem } from "../src/core/gamedata";
import { currencyCode, parseMoney, TBH_STEAM_APP_ID } from "../src/core/steamPrice";
import type { LookupPriceSnapshot } from "../shared/types";
import type { ListedResult, PriceState } from "../src/core/lookupPrice";

const GAMEDATA_PATH = fileURLToPath(new URL("../../data/gamedata.json", import.meta.url));
const PRICEOVERVIEW = "https://steamcommunity.com/market/priceoverview/";
const FRANKFURTER_LATEST = "https://api.frankfurter.app/latest?from=USD";
const USD = currencyCode("USD");

const OUT = process.env.OUT ?? "prices.json";
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : undefined;
const DELAY_MS = process.env.DELAY_MS ? Number(process.env.DELAY_MS) : 1500;
const PERSIST_EVERY = 25;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const log = (message: string): void => console.log(`[lookup-prices] ${message}`);

function loadCatalog(): GameItem[] {
  const raw = JSON.parse(readFileSync(GAMEDATA_PATH, "utf-8")) as {
    items?: Record<string, unknown>[];
  };
  const items = (raw.items ?? [])
    .map((row) => normalizeGameItem(row))
    .filter((item): item is GameItem => item != null);
  if (LIMIT == null) return items;
  // For a smoke run, keep enough rows to yield ~LIMIT priceable hashes.
  return items.filter((item) => item.marketTradable).slice(0, LIMIT * 4);
}

function loadResume(): { state: PriceState; fx: Record<string, number> } {
  if (!existsSync(OUT)) return { state: { prices: {}, fetchedUtc: {} }, fx: {} };
  try {
    const prior = JSON.parse(readFileSync(OUT, "utf-8")) as LookupPriceSnapshot;
    log(`resuming from ${OUT} (${Object.keys(prior.prices ?? {}).length} known)`);
    return {
      state: { prices: prior.prices ?? {}, fetchedUtc: prior.fetchedUtc ?? {} },
      fx: prior.fx ?? {},
    };
  } catch {
    return { state: { prices: {}, fetchedUtc: {} }, fx: {} };
  }
}

/** Steam priceoverview, USD, listed price only (lowest active listing). */
async function fetchListedUsd(hash: string): Promise<ListedResult> {
  const url =
    `${PRICEOVERVIEW}?appid=${TBH_STEAM_APP_ID}&currency=${USD}` +
    `&market_hash_name=${encodeURIComponent(hash)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (TBH Companion price snapshot)" },
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return { ok: false, rateLimited: false };
  }
  if (res.status === 429) return { ok: false, rateLimited: true };
  if (!res.ok) return { ok: false, rateLimited: false };

  const data = (await res.json()) as { success?: boolean; lowest_price?: string };
  // success=false or no lowest_price => no active listing (median is ignored).
  if (!data.success) return { ok: true, usd: null };
  return { ok: true, usd: parseMoney(data.lowest_price) };
}

async function fetchFxRates(): Promise<Record<string, number>> {
  const res = await fetch(FRANKFURTER_LATEST, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`frankfurter HTTP ${res.status}`);
  const data = (await res.json()) as { rates?: Record<string, number> };
  return { USD: 1, ...(data.rates ?? {}) };
}

async function main(): Promise<void> {
  const items = loadCatalog();
  const resume = loadResume();

  // Persist partial progress periodically so a killed/timed-out CI run still
  // leaves a resumable snapshot on disk (uploaded by the workflow's always-step).
  let sincePersist = 0;
  const persistPartial = (state: PriceState): void => {
    sincePersist += 1;
    if (sincePersist < PERSIST_EVERY) return;
    sincePersist = 0;
    writeFileSync(
      OUT,
      JSON.stringify(
        buildSnapshot({ prices: state.prices, fetchedUtc: state.fetchedUtc, fx: resume.fx }),
      ),
    );
  };

  const snapshot = await assembleSnapshot(items, {
    fetchListedUsd,
    fetchFxRates,
    sleep,
    baseDelayMs: DELAY_MS,
    resume: resume.state,
    resumeFx: resume.fx,
    onProgress: persistPartial,
    log,
  });

  writeFileSync(OUT, JSON.stringify(snapshot));
  const priced = Object.values(snapshot.prices).filter((value) => value != null).length;
  const total = Object.keys(snapshot.prices).length;
  log(
    `wrote ${OUT}: ${priced}/${total} with a listing, ${Object.keys(snapshot.fx).length} currencies`,
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
