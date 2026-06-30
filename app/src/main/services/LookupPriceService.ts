// Downloads, caches, and serves the shared Lookup price snapshot (built by the
// `lookup-prices` GitHub Action). This is the client side of the snapshot
// pipeline — it never calls Steam, only fetches one published JSON. Distinct
// from owned-inventory pricing (`SteamMarketProvider`). All fetch/parse/cache
// outcomes are logged for support.

import { app } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { LookupPriceSnapshot } from "../../../shared/types";
import { IPC } from "../../../shared/ipc";
import { createLogger } from "../log";
import { broadcast } from "./broadcast";
import { LOOKUP_PRICES_FILE } from "./appData";

const log = createLogger("lookupPrices");

const OWNER = "lucasfevi";
const REPO = "tbh-companion";
const RELEASE_TAG = "lookup-prices";
const ASSET_URL = `https://github.com/${OWNER}/${REPO}/releases/download/${RELEASE_TAG}/prices.json`;
const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // on launch + every 30 min

export function isLookupPriceSnapshot(value: unknown): value is LookupPriceSnapshot {
  if (value == null || typeof value !== "object") return false;
  const snapshot = value as Record<string, unknown>;
  return (
    snapshot.schemaVersion === 1 &&
    typeof snapshot.generatedUtc === "string" &&
    typeof snapshot.prices === "object" &&
    snapshot.prices != null &&
    typeof snapshot.fx === "object" &&
    snapshot.fx != null
  );
}

function defaultCachePath(): string {
  try {
    return join(app.getPath("userData"), LOOKUP_PRICES_FILE);
  } catch {
    return join(process.cwd(), LOOKUP_PRICES_FILE);
  }
}

export interface LookupPriceServiceDeps {
  /** Injected for tests; defaults to global fetch. */
  fetchFn?: typeof fetch;
  /** Injected for tests; defaults to the userData cache path. */
  cacheFilePath?: () => string;
  /** Injected for tests; defaults to renderer broadcast. */
  broadcastFn?: (channel: string, payload: unknown) => void;
}

export class LookupPriceService {
  private snapshot: LookupPriceSnapshot | null = null;
  private etag: string | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly fetchFn: typeof fetch;
  private readonly cacheFilePath: () => string;
  private readonly broadcastFn: (channel: string, payload: unknown) => void;

  constructor(deps: LookupPriceServiceDeps = {}) {
    this.fetchFn = deps.fetchFn ?? fetch;
    this.cacheFilePath = deps.cacheFilePath ?? defaultCachePath;
    this.broadcastFn = deps.broadcastFn ?? broadcast;
  }

  /** Load the cached snapshot, then refresh and poll every 30 min. */
  start(): void {
    this.loadFromDisk();
    void this.refresh();
    this.timer = setInterval(() => void this.refresh(), REFRESH_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getSnapshot(): LookupPriceSnapshot | null {
    return this.snapshot;
  }

  /** Re-read the cache after a Settings clear (file deleted → snapshot null). */
  reloadFromDisk(): void {
    this.etag = null;
    this.loadFromDisk();
    this.broadcastFn(IPC.LOOKUP_PRICES, this.snapshot);
  }

  private loadFromDisk(): void {
    const path = this.cacheFilePath();
    if (!existsSync(path)) {
      this.snapshot = null;
      return;
    }
    try {
      const parsed = JSON.parse(readFileSync(path, "utf-8")) as unknown;
      if (isLookupPriceSnapshot(parsed)) {
        this.snapshot = parsed;
        log.info(
          `Loaded cached snapshot: ${Object.keys(parsed.prices).length} prices, generated ${parsed.generatedUtc}`,
        );
      } else {
        log.warn("Cached Lookup snapshot failed validation; ignoring");
        this.snapshot = null;
      }
    } catch (err) {
      log.warn(`Failed to read cached Lookup snapshot: ${(err as Error).message}`);
      this.snapshot = null;
    }
  }

  /** Fetch the published snapshot; replace + broadcast only when it's newer. */
  async refresh(): Promise<void> {
    const headers: Record<string, string> = { "User-Agent": "TBH Companion" };
    if (this.etag) headers["If-None-Match"] = this.etag;

    let res: Response;
    try {
      res = await this.fetchFn(ASSET_URL, { headers, signal: AbortSignal.timeout(30_000) });
    } catch (err) {
      log.warn(`Lookup snapshot fetch failed: ${(err as Error).message}`);
      return;
    }

    if (res.status === 304) {
      log.info("Lookup snapshot unchanged (304)");
      return;
    }
    if (!res.ok) {
      log.warn(`Lookup snapshot fetch HTTP ${res.status}`);
      return;
    }

    let parsed: unknown;
    try {
      parsed = await res.json();
    } catch (err) {
      log.warn(`Lookup snapshot parse failed: ${(err as Error).message}; keeping previous`);
      return;
    }
    if (!isLookupPriceSnapshot(parsed)) {
      log.warn("Fetched Lookup snapshot failed validation; keeping previous");
      return;
    }

    const etag = res.headers.get("etag");
    if (etag) this.etag = etag;

    if (this.snapshot && this.snapshot.generatedUtc === parsed.generatedUtc) {
      log.info("Lookup snapshot already current");
      return;
    }

    this.snapshot = parsed;
    this.persist(parsed);
    log.info(
      `Lookup snapshot updated: ${Object.keys(parsed.prices).length} prices, generated ${parsed.generatedUtc}`,
    );
    this.broadcastFn(IPC.LOOKUP_PRICES, parsed);
  }

  private persist(snapshot: LookupPriceSnapshot): void {
    const path = this.cacheFilePath();
    try {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, JSON.stringify(snapshot));
    } catch (err) {
      log.warn(`Failed to persist Lookup snapshot: ${(err as Error).message}`);
    }
  }
}
