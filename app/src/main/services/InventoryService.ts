import { GameDataProvider } from "../gameDataProvider";
import { SteamMarketProvider } from "../steamMarketProvider";
import {
  resolveInventory,
  ownedPriceTargets,
  ownedPriceTargetForItem,
  parseInventory,
} from "../../core/inventory";
import type { OwnedPriceTarget } from "../../core/inventory/ownedPriceTargets";
import type {
  InventorySnapshot,
  ResolvedInventory,
  InventoryPriceInfo,
  PriceProgress,
  PriceStatus,
  PriceRefreshResult,
  GameDataStatus,
  GameDataRefreshResult,
} from "../../../shared/types";
import { IPC } from "../../../shared/ipc";
import { broadcast } from "./broadcast";
import { createLogger } from "../log";

const log = createLogger("inventory");

export class InventoryService {
  private readonly gameData = new GameDataProvider();
  private market: SteamMarketProvider | null = null;
  private lastInventoryRaw: InventorySnapshot | null = null;
  private lastInventory: ResolvedInventory | null = null;
  private priceRefreshQueued = false;
  private priceRefreshForceQueued = false;
  private priceRefreshPendingTargets: OwnedPriceTarget[] = [];

  initMarket(currency: string): void {
    this.market = new SteamMarketProvider(currency);
  }

  loadGameData(): void {
    this.gameData.load();
    this.gameData.overlayMissingLevelsFromBundled();
    this.resolveAndPushInventory();
    this.gameData.refreshIfStale(() => this.resolveAndPushInventory());
  }

  reloadGameData(): void {
    this.gameData.reload();
    this.gameData.overlayMissingLevelsFromBundled();
    this.resolveAndPushInventory();
  }

  reloadPriceCache(): void {
    this.market?.reloadFromDisk();
    this.resolveAndPushInventory();
    this.pushPricesStatus();
  }

  onInventory(snap: InventorySnapshot): void {
    this.lastInventoryRaw = snap;
    this.resolveAndPushInventory();
    void this.ensureOwnedPrices();
  }

  private excludeFromInventoryListing(itemKey: number): boolean {
    return this.gameData.isStageBox(itemKey);
  }

  private currentOwnedPriceTargets(): OwnedPriceTarget[] {
    if (!this.lastInventoryRaw) return [];
    return ownedPriceTargets(
      this.lastInventoryRaw,
      (key) => this.gameData.get(key),
      (key) => this.excludeFromInventoryListing(key),
    );
  }

  private targetKey(target: OwnedPriceTarget): string {
    return target.kind === "material" ? target.hash : (target.candidates[0] ?? "");
  }

  parseFromSave(text: string, mtime: number): InventorySnapshot {
    return parseInventory(text, mtime, (key) => this.gameData.get(key)?.type === "MATERIAL");
  }

  getInventory(): ResolvedInventory | null {
    return this.lastInventory;
  }

  gameDataStatus(): GameDataStatus {
    return this.gameData.status();
  }

  async refreshGameData(): Promise<GameDataRefreshResult & { status: GameDataStatus }> {
    const result = await this.gameData.refresh();
    if (result.ok) {
      this.gameData.overlayMissingLevelsFromBundled();
      this.resolveAndPushInventory();
      log.info(`Game data refreshed (${result.count ?? 0} items)`);
    } else {
      log.warn(`Game data refresh failed: ${result.error ?? "unknown"}`);
    }
    return { ...result, status: this.gameData.status() };
  }

  pricesStatus(): PriceStatus {
    return this.market!.status(this.currentOwnedPriceTargets());
  }

  cancelPrices(): void {
    this.market?.cancel();
  }

  setCurrency(iso: string): PriceStatus {
    this.market!.setCurrency(iso);
    this.resolveAndPushInventory();
    void this.ensureOwnedPrices(true);
    return this.pricesStatus();
  }

  private queuePriceRefresh(force: boolean): PriceRefreshResult & { status: PriceStatus } {
    this.priceRefreshQueued = true;
    if (force) this.priceRefreshForceQueued = true;
    log.info("Price refresh queued (already running)");
    return {
      ...this.queuePriceRefreshResult(),
      status: this.pricesStatus(),
    };
  }

  private queuePriceRefreshResult(): PriceRefreshResult {
    return {
      ok: true,
      priced: 0,
      skipped: 0,
      failed: 0,
      stopped: "completed",
      currency: this.market!.status().currency,
      queued: true,
    };
  }

  async refreshPrices(force?: boolean): Promise<PriceRefreshResult & { status: PriceStatus }> {
    const wantsForce = Boolean(force);
    if (this.market!.status().running) {
      return this.queuePriceRefresh(wantsForce);
    }

    const targets = this.currentOwnedPriceTargets();
    this.market!.pruneCacheTargets(targets);

    const result = await this.market!.refresh(targets, this.priceRefreshCallbacks(wantsForce));
    this.resolveAndPushInventory();
    const status = this.pricesStatus();
    if (result.ok && !result.queued && !result.noop) {
      log.info(
        `Price refresh ${result.stopped}: priced=${result.priced} failed=${result.failed} skipped=${result.skipped}`,
      );
    } else if (!result.ok) {
      log.warn(`Price refresh failed: ${result.error ?? "unknown"}`);
    }
    return { ...result, status };
  }

  async refreshItemPrices(itemKey: number): Promise<PriceRefreshResult & { status: PriceStatus }> {
    const item = this.gameData.get(itemKey);
    if (!item) {
      return {
        ok: false,
        priced: 0,
        skipped: 0,
        failed: 0,
        stopped: "completed",
        currency: this.market!.status().currency,
        error: "unknown item",
        status: this.pricesStatus(),
      };
    }

    const target = ownedPriceTargetForItem(item);
    if (!target) {
      return {
        ok: false,
        priced: 0,
        skipped: 0,
        failed: 0,
        stopped: "completed",
        currency: this.market!.status().currency,
        error: "not priceable",
        status: this.pricesStatus(),
      };
    }

    return this.refreshPricesForTargets([target]);
  }

  private async refreshPricesForTargets(
    targets: OwnedPriceTarget[],
  ): Promise<PriceRefreshResult & { status: PriceStatus }> {
    if (this.market!.status().running) {
      for (const target of targets) {
        const key = this.targetKey(target);
        if (!this.priceRefreshPendingTargets.some((t) => this.targetKey(t) === key)) {
          this.priceRefreshPendingTargets.push(target);
        }
      }
      log.info(`Price refresh queued for ${targets.length} item(s) (already running)`);
      return {
        ...this.queuePriceRefreshResult(),
        status: this.pricesStatus(),
      };
    }

    const result = await this.market!.refresh(targets, this.priceRefreshCallbacks(true));
    this.resolveAndPushInventory();
    const status = this.pricesStatus();
    if (result.ok && !result.queued && !result.noop) {
      log.info(
        `Item price refresh ${result.stopped}: priced=${result.priced} failed=${result.failed} skipped=${result.skipped}`,
      );
    } else if (!result.ok) {
      log.warn(`Item price refresh failed: ${result.error ?? "unknown"}`);
    }
    return { ...result, status };
  }

  resolveAndPushInventory(): void {
    if (!this.lastInventoryRaw || !this.market) return;
    try {
      const status = this.gameData.status();
      const currency = this.market.status().currency;
      this.lastInventory = resolveInventory(
        this.lastInventoryRaw,
        (key) => this.gameData.get(key),
        status.loaded,
        (name) => this.priceLookup(name),
        { excludeItemKey: (key) => this.excludeFromInventoryListing(key) },
      );
      this.lastInventory.currency = currency;
      this.lastInventory.composition.currency = currency;
      broadcast(IPC.INVENTORY, this.lastInventory);
    } catch (err) {
      log.error(`resolveAndPushInventory failed: ${String(err)}`);
    }
  }

  async ensureOwnedPrices(force = false): Promise<void> {
    if (!this.lastInventoryRaw || !this.market) return;

    if (this.market.status().running) {
      this.priceRefreshQueued = true;
      if (force) this.priceRefreshForceQueued = true;
      return;
    }

    const targets = this.currentOwnedPriceTargets();
    this.market.pruneCacheTargets(targets);

    const pending = this.market.pendingTargets(targets, force);
    if (!force && pending.length === 0) return;

    await this.market.refresh(targets, this.priceRefreshCallbacks(force));
    this.resolveAndPushInventory();
  }

  private drainPriceRefreshQueue(): void {
    if (this.priceRefreshPendingTargets.length > 0) {
      const targets = this.priceRefreshPendingTargets.splice(0);
      void this.refreshPricesForTargets(targets);
      return;
    }
    if (!this.priceRefreshQueued) return;
    const queuedForce = this.priceRefreshForceQueued;
    this.priceRefreshQueued = false;
    this.priceRefreshForceQueued = false;
    void this.ensureOwnedPrices(queuedForce);
  }

  getMarket(): SteamMarketProvider {
    return this.market!;
  }

  private priceLookup(name: string): InventoryPriceInfo | undefined {
    const e = this.market?.get(name);
    if (!e) return undefined;
    return {
      median: e.median,
      lowest: e.lowest,
      rawMedian: e.rawMedian ?? null,
      rawLowest: e.rawLowest ?? (e as { raw?: string | null }).raw ?? null,
      buyOrder: e.buyOrder ?? null,
      rawBuyOrder: e.rawBuyOrder ?? null,
      buyOrderFetched: e.buyOrderFetched === true,
    };
  }

  private broadcastPriceProgress(p: PriceProgress): void {
    broadcast(IPC.PRICES_PROGRESS, p);
  }

  private pushPricesStatus(): void {
    if (!this.market) return;
    broadcast(IPC.PRICE_STATUS, this.pricesStatus());
  }

  private priceRefreshCallbacks(force = false): {
    force: boolean;
    onProgress: (p: PriceProgress) => void;
    onPriced: () => void;
    onFinished: (result: PriceRefreshResult) => void;
  } {
    return {
      force,
      onProgress: (p) => this.broadcastPriceProgress(p),
      onPriced: () => this.resolveAndPushInventory(),
      onFinished: (result) => {
        this.broadcastPriceProgress({
          done: 0,
          total: 0,
          current: "",
          priced: 0,
          failed: 0,
          finished: true,
          result: {
            priced: result.priced,
            skipped: result.skipped,
            failed: result.failed,
            stopped: result.stopped,
            noop: result.noop,
            queued: result.queued,
          },
        });
        this.drainPriceRefreshQueue();
      },
    };
  }
}
