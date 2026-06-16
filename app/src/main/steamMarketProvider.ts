// Steam Market price provider — orchestrates cache + API fetches.

import type { OwnedPriceTarget } from "../core/inventory/ownedPriceTargets";
import { flattenOwnedHashes } from "../core/inventory/ownedPriceTargets";
import type { PriceStatus, PriceProgress, PriceRefreshResult } from "../../shared/types";
import {
  type PriceEntry,
  type PriceCache,
  loadPriceCache,
  persistPriceCache,
} from "./services/priceCache";
import { fetchSteamPrice } from "./services/steamPriceApi";
import { fetchSteamBuyOrder } from "./services/steamBuyOrderApi";
import { getSteamItemNameIdService } from "./services/steamItemNameId";
import { FRESH_TTL_MS } from "./services/steamMarketConstants";
import { createLogger } from "./log";

export { FRESH_TTL_MS };
export type { PriceEntry };

const log = createLogger("market");

const DEFAULT_DELAY_MS = 1500;
const MAX_DELAY_MS = 60000;
const PERSIST_EVERY_PRICED = 5;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function sleepUntil(ms: number, isCancelled: () => boolean): Promise<void> {
  const step = 100;
  let remaining = ms;
  while (remaining > 0 && !isCancelled()) {
    await sleep(Math.min(step, remaining));
    remaining -= step;
  }
}

type RefreshCallbacks = {
  force?: boolean;
  onProgress?: (progress: PriceProgress) => void;
  onPriced?: (name: string) => void;
  onFinished?: (result: PriceRefreshResult) => void;
};

type RefreshCounters = {
  priced: number;
  skipped: number;
  failed: number;
};

type FetchStep = "advance" | "retry";

function emptyRefreshResult(currency: string): PriceRefreshResult {
  return {
    ok: true,
    priced: 0,
    skipped: 0,
    failed: 0,
    stopped: "completed",
    currency,
  };
}

function entryHasSellPrice(entry: PriceEntry): boolean {
  return entry.median != null || entry.lowest != null;
}

function finalizeStopped(
  counters: RefreshCounters,
  sawRateLimit: boolean,
  cancelled: boolean,
): PriceRefreshResult["stopped"] {
  if (cancelled) return "cancelled";
  if (sawRateLimit && counters.priced === 0 && counters.failed > 0) return "rate-limited";
  return "completed";
}

function targetLabel(target: OwnedPriceTarget): string {
  if (target.kind === "material") return target.hash;
  return target.candidates[0] ?? "gear";
}

export class SteamMarketProvider {
  private currency: string;
  private cache: PriceCache;
  private running = false;
  private cancelled = false;

  constructor(currency: string) {
    this.currency = currency.toUpperCase();
    this.cache = loadPriceCache(this.currency);
  }

  setCurrency(currency: string): void {
    const next = currency.toUpperCase();
    if (next === this.currency) return;
    this.currency = next;
    this.cache = loadPriceCache(next);
  }

  /** Reload in-memory cache after price files were deleted from disk. */
  reloadFromDisk(): void {
    this.cache = loadPriceCache(this.currency);
  }

  get(name: string): PriceEntry | undefined {
    return this.cache.prices[name];
  }

  isFresh(name: string, now = Date.now()): boolean {
    const entry = this.cache.prices[name];
    if (!entry) return false;
    if (!entryHasSellPrice(entry)) return false;
    if (now - Date.parse(entry.fetchedUtc) >= FRESH_TTL_MS) return false;
    if (!entry.buyOrderCheckUtc) return false;
    if (now - Date.parse(entry.buyOrderCheckUtc) >= FRESH_TTL_MS) return false;
    return true;
  }

  isFreshTarget(target: OwnedPriceTarget, now = Date.now()): boolean {
    if (target.kind === "material") return this.isFresh(target.hash, now);
    return target.candidates.some((hash) => this.isFresh(hash, now));
  }

  pendingTargets(targets: OwnedPriceTarget[], force = false, now = Date.now()): OwnedPriceTarget[] {
    if (force) return targets.slice();
    return targets.filter((target) => !this.isFreshTarget(target, now));
  }

  /** Remove cache entries not in the current owned set. Returns count removed. */
  pruneCache(ownedHashes: string[]): number {
    const owned = new Set(ownedHashes);
    let removed = 0;
    for (const key of Object.keys(this.cache.prices)) {
      if (owned.has(key)) continue;
      delete this.cache.prices[key];
      removed++;
    }
    if (removed === 0) return 0;
    persistPriceCache(this.cache);
    log.info(`Pruned ${removed} orphan cache entries`);
    return removed;
  }

  pruneCacheTargets(targets: OwnedPriceTarget[]): number {
    return this.pruneCache(flattenOwnedHashes(targets));
  }

  status(ownedTargets?: OwnedPriceTarget[]): PriceStatus {
    const now = Date.now();
    const targets = ownedTargets ?? [];
    let freshCount = 0;
    let staleCount = 0;
    for (const target of targets) {
      if (this.isFreshTarget(target, now)) freshCount++;
      else staleCount++;
    }
    return {
      currency: this.currency,
      count: targets.length > 0 ? freshCount + staleCount : Object.keys(this.cache.prices).length,
      ownedTargets: targets.length,
      freshCount,
      staleCount,
      fetchedUtc: this.cache.fetchedUtc,
      running: this.running,
    };
  }

  cancel(): void {
    this.cancelled = true;
  }

  async refresh(
    targets: OwnedPriceTarget[] | undefined,
    opts: RefreshCallbacks = {},
  ): Promise<PriceRefreshResult> {
    if (this.running) {
      return {
        ...emptyRefreshResult(this.currency),
        ok: false,
        stopped: "cancelled",
        error: "already running",
      };
    }

    const list = targets?.length ? targets.slice() : [];
    let result = emptyRefreshResult(this.currency);

    this.running = true;
    this.cancelled = false;

    try {
      if (list.length === 0) return result;

      const force = Boolean(opts.force);
      const staleTargets = this.pendingTargets(list, force);
      if (!force && staleTargets.length === 0) {
        result = { ...emptyRefreshResult(this.currency), skipped: list.length, noop: true };
        return result;
      }

      log.info(
        `Refresh start currency=${this.currency} targets=${list.length} stale=${staleTargets.length} force=${force}`,
      );

      const counters = await this.fetchAllTargets(list, force, opts);
      const stopped = finalizeStopped(counters, counters.sawRateLimit, this.cancelled);

      if (counters.priced > 0) this.cache.fetchedUtc = new Date().toISOString();
      persistPriceCache(this.cache);

      result = {
        ok: true,
        priced: counters.priced,
        skipped: counters.skipped,
        failed: counters.failed,
        stopped,
        currency: this.currency,
      };
      log.info(
        `Refresh ${stopped}: priced=${counters.priced} failed=${counters.failed} skipped=${counters.skipped}`,
      );
      return result;
    } catch (err) {
      persistPriceCache(this.cache);
      result = {
        ...result,
        ok: false,
        error: (err as Error).message,
      };
      log.warn(`Refresh failed: ${result.error ?? "unknown"}`);
      return result;
    } finally {
      this.running = false;
      opts.onFinished?.(result);
    }
  }

  private async fetchAllTargets(
    targets: OwnedPriceTarget[],
    force: boolean,
    opts: RefreshCallbacks,
  ): Promise<RefreshCounters & { sawRateLimit: boolean }> {
    const now = Date.now();
    const counters: RefreshCounters = { priced: 0, skipped: 0, failed: 0 };
    let delayMs = DEFAULT_DELAY_MS;
    let sawRateLimit = false;

    for (let index = 0; index < targets.length; ) {
      if (this.cancelled) break;

      const target = targets[index];
      if (!force && this.isFreshTarget(target, now)) {
        counters.skipped++;
        this.emitProgress(opts, targets.length, index + 1, targetLabel(target), counters);
        index++;
        continue;
      }

      const step = await this.priceTarget(target, counters, opts);
      if (step === "retry") {
        sawRateLimit = true;
        delayMs = Math.min(delayMs * 2, MAX_DELAY_MS);
        log.warn(`Rate-limited ${targetLabel(target)} backoff=${Math.round(delayMs / 1000)}s`);
        this.emitProgress(
          opts,
          targets.length,
          index + 1,
          `${targetLabel(target)} (rate-limited, waiting ${Math.round(delayMs / 1000)}s)`,
          counters,
        );
        await sleepUntil(delayMs, () => this.cancelled);
        continue;
      }

      delayMs = DEFAULT_DELAY_MS;
      this.emitProgress(opts, targets.length, index + 1, targetLabel(target), counters);
      if (counters.priced > 0 && counters.priced % PERSIST_EVERY_PRICED === 0) {
        persistPriceCache(this.cache);
      }
      await sleepUntil(delayMs, () => this.cancelled);
      index++;
    }

    return { ...counters, sawRateLimit };
  }

  private async priceTarget(
    target: OwnedPriceTarget,
    counters: RefreshCounters,
    opts: RefreshCallbacks,
  ): Promise<FetchStep> {
    if (target.kind === "material") {
      return this.priceOneHash(target.hash, counters, opts);
    }
    return this.priceGearVariants(target.candidates, counters, opts);
  }

  private async priceGearVariants(
    candidates: readonly string[],
    counters: RefreshCounters,
    opts: RefreshCallbacks,
  ): Promise<FetchStep> {
    for (const hash of candidates) {
      const step = await this.priceOneHash(hash, counters, opts, { countAsPriced: false });
      if (step === "retry") return "retry";
      const entry = this.cache.prices[hash];
      if (entry && entryHasSellPrice(entry)) {
        counters.priced++;
        opts.onPriced?.(hash);
        return "advance";
      }
    }
    counters.failed++;
    return "advance";
  }

  private async priceOneHash(
    name: string,
    counters: RefreshCounters,
    opts: RefreshCallbacks,
    options: { countAsPriced?: boolean } = {},
  ): Promise<FetchStep> {
    const countAsPriced = options.countAsPriced !== false;
    try {
      const response = await fetchSteamPrice(name, this.currency);
      if (response.status === 0) {
        log.warn(`Fetch timeout ${name}`);
        if (countAsPriced) counters.failed++;
        return "advance";
      }
      if (response.status === 429) return "retry";
      if (response.ok && response.entry && entryHasSellPrice(response.entry)) {
        const entry = response.entry;
        const nameIdService = getSteamItemNameIdService();
        const resolved = await nameIdService.resolve(name);
        if (resolved.status === 429) return "retry";
        const nameId = resolved.ok ? resolved.nameId : (nameIdService.getSync(name) ?? undefined);
        if (nameId != null) {
          const buy = await fetchSteamBuyOrder(nameId, name, this.currency);
          if (buy.status === 429) return "retry";
          if (buy.ok) {
            const checkedUtc = new Date().toISOString();
            entry.buyOrderFetched = true;
            entry.buyOrderCheckUtc = checkedUtc;
            entry.buyOrder = buy.buyOrder ?? null;
            entry.rawBuyOrder = buy.rawBuyOrder ?? null;
          }
        }
        this.cache.prices[name] = entry;
        if (countAsPriced) {
          counters.priced++;
          opts.onPriced?.(name);
        }
        return "advance";
      }
      if (countAsPriced) counters.failed++;
      return "advance";
    } catch {
      if (countAsPriced) counters.failed++;
      return "advance";
    }
  }

  private emitProgress(
    opts: RefreshCallbacks,
    total: number,
    done: number,
    current: string,
    counters: RefreshCounters,
  ): void {
    opts.onProgress?.({
      done,
      total,
      current,
      priced: counters.priced,
      failed: counters.failed,
    });
  }
}
