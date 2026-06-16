// Steam Market price provider — orchestrates cache + API fetches.

import type { OwnedPriceTarget } from "../core/inventory/ownedPriceTargets";
import { flattenOwnedHashes } from "../core/inventory/ownedPriceTargets";
import { limitGearVariantHashes } from "../core/marketName";
import type { PriceStatus, PriceProgress, PriceRefreshResult } from "../../shared/types";
import {
  type PriceEntry,
  type PriceCache,
  loadPriceCache,
  persistPriceCache,
} from "./services/priceCache";
import { fetchSteamPrice, describeSteamPriceFailure } from "./services/steamPriceApi";
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

function entryHasBuyOrder(entry: PriceEntry): boolean {
  return entry.buyOrderFetched === true && entry.buyOrder != null;
}

function entryHasMarketData(entry: PriceEntry): boolean {
  return entryHasSellPrice(entry) || entryHasBuyOrder(entry);
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
    const hasSell = entryHasSellPrice(entry);
    const hasBuy = entryHasBuyOrder(entry);
    if (!hasSell && !hasBuy) return false;
    if (hasSell && now - Date.parse(entry.fetchedUtc) >= FRESH_TTL_MS) return false;
    if (hasBuy) {
      if (!entry.buyOrderCheckUtc) return false;
      if (now - Date.parse(entry.buyOrderCheckUtc) >= FRESH_TTL_MS) return false;
    } else if (!entry.buyOrderCheckUtc) {
      return false;
    }
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
    const hash = limitGearVariantHashes(target.candidates)[0];
    if (!hash) {
      counters.failed++;
      return "advance";
    }
    return this.priceOneHash(hash, counters, opts);
  }

  private async priceOneHash(
    name: string,
    counters: RefreshCounters,
    opts: RefreshCallbacks,
    options: { countAsPriced?: boolean; onFail?: (detail: string) => void } = {},
  ): Promise<FetchStep> {
    const countAsPriced = options.countAsPriced !== false;
    try {
      const response = await fetchSteamPrice(name, this.currency);
      if (response.status === 429) return "retry";

      const entry = response.ok ? response.entry : response.entry;
      if (!entry) {
        if (!response.ok) {
          const detail = describeSteamPriceFailure(response);
          options.onFail?.(detail);
          if (countAsPriced) {
            counters.failed++;
            log.warn(`Price failed: ${name} (${this.currency}) - ${detail}`);
          }
        }
        return "advance";
      }

      const buyStep = await this.attachBuyOrder(name, entry);
      if (buyStep === "retry") return "retry";

      this.cache.prices[name] = entry;
      if (countAsPriced) {
        if (entryHasMarketData(entry)) {
          counters.priced++;
          opts.onPriced?.(name);
        } else {
          const detail = response.ok
            ? "no sell listing or buy orders"
            : describeSteamPriceFailure(response as Extract<typeof response, { ok: false }>);
          options.onFail?.(detail);
          counters.failed++;
          log.warn(`Price failed: ${name} (${this.currency}) - ${detail}`);
        }
      }
      return "advance";
    } catch (err) {
      const detail = err instanceof Error ? err.message : "unexpected error";
      options.onFail?.(detail);
      if (countAsPriced) {
        counters.failed++;
        log.warn(`Price failed: ${name} (${this.currency}) - ${detail}`);
      }
      return "advance";
    }
  }

  private async attachBuyOrder(name: string, entry: PriceEntry): Promise<FetchStep> {
    const nameIdService = getSteamItemNameIdService();
    const resolved = await nameIdService.resolve(name);
    if (resolved.status === 429) return "retry";
    const nameId = resolved.ok ? resolved.nameId : (nameIdService.getSync(name) ?? undefined);
    if (nameId == null) return "advance";

    const buy = await fetchSteamBuyOrder(nameId, name, this.currency);
    if (buy.status === 429) return "retry";
    if (!buy.ok) return "advance";

    const checkedUtc = new Date().toISOString();
    entry.buyOrderFetched = true;
    entry.buyOrderCheckUtc = checkedUtc;
    entry.buyOrder = buy.buyOrder ?? null;
    entry.rawBuyOrder = buy.rawBuyOrder ?? null;
    entry.buyOrderQuantity = buy.buyOrderQuantity ?? null;
    return "advance";
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
