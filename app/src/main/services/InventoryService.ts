import { GameDataProvider } from "../gameDataProvider";
import { SteamMarketProvider } from "../steamMarketProvider";
import { resolveInventory, ownedMarketNames, parseInventory } from "../../core/inventory";
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
  }

  onInventory(snap: InventorySnapshot): void {
    this.lastInventoryRaw = snap;
    this.resolveAndPushInventory();
    void this.ensureOwnedPrices();
  }

  private excludeFromInventoryListing(itemKey: number): boolean {
    return this.gameData.isStageBox(itemKey);
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
    return this.market!.status();
  }

  cancelPrices(): void {
    this.market?.cancel();
  }

  setCurrency(iso: string): PriceStatus {
    this.market!.setCurrency(iso);
    this.resolveAndPushInventory();
    void this.ensureOwnedPrices(true);
    return this.market!.status();
  }

  async refreshPrices(force?: boolean): Promise<PriceRefreshResult & { status: PriceStatus }> {
    const result = await this.market!.refresh(
      this.lastInventoryRaw
        ? ownedMarketNames(
            this.lastInventoryRaw,
            (key) => this.gameData.get(key),
            (key) => this.excludeFromInventoryListing(key),
          )
        : undefined,
      this.priceRefreshCallbacks(Boolean(force)),
    );
    this.resolveAndPushInventory();
    const status = this.market!.status();
    if (result.ok) {
      log.info(
        `Price refresh ${result.stopped}: priced=${result.priced} failed=${result.failed} skipped=${result.skipped}`,
      );
    } else {
      log.warn(`Price refresh failed: ${result.error ?? "unknown"}`);
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
      return;
    }

    const names = ownedMarketNames(
      this.lastInventoryRaw,
      (key) => this.gameData.get(key),
      (key) => this.excludeFromInventoryListing(key),
    );
    const pending = this.market.pendingNames(names, force);
    if (pending.length === 0) return;

    await this.market.refresh(names, {
      ...this.priceRefreshCallbacks(force),
    });

    this.resolveAndPushInventory();

    if (this.priceRefreshQueued) {
      this.priceRefreshQueued = false;
      void this.ensureOwnedPrices();
    }
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
    };
  }

  private broadcastPriceProgress(p: PriceProgress): void {
    broadcast(IPC.PRICES_PROGRESS, p);
  }

  private priceRefreshCallbacks(force = false): {
    force: boolean;
    onProgress: (p: PriceProgress) => void;
    onPriced: () => void;
    onFinished: () => void;
  } {
    return {
      force,
      onProgress: (p) => this.broadcastPriceProgress(p),
      onPriced: () => this.resolveAndPushInventory(),
      onFinished: () =>
        this.broadcastPriceProgress({
          done: 0,
          total: 0,
          current: "",
          priced: 0,
          failed: 0,
          finished: true,
        }),
    };
  }
}
