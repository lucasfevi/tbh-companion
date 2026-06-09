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
    if (this.gameData.overlayMissingLevelsFromBundled()) {
      this.resolveAndPushInventory();
    }
    this.gameData.refreshIfStale(() => this.resolveAndPushInventory());
  }

  onInventory(snap: InventorySnapshot): void {
    this.lastInventoryRaw = snap;
    this.resolveAndPushInventory();
    void this.ensureOwnedPrices();
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
    if (result.ok) this.resolveAndPushInventory();
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
        ? ownedMarketNames(this.lastInventoryRaw, (key) => this.gameData.get(key))
        : undefined,
      {
        force: Boolean(force),
        onProgress: (p) => this.broadcastPriceProgress(p),
        onPriced: () => this.resolveAndPushInventory(),
      },
    );
    this.resolveAndPushInventory();
    return { ...result, status: this.market!.status() };
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
      );
      this.lastInventory.currency = currency;
      this.lastInventory.composition.currency = currency;
      broadcast(IPC.INVENTORY, this.lastInventory);
    } catch (err) {
      console.error("resolveAndPushInventory failed:", err);
    }
  }

  async ensureOwnedPrices(force = false): Promise<void> {
    if (!this.lastInventoryRaw || !this.market) return;

    if (this.market.status().running) {
      this.priceRefreshQueued = true;
      return;
    }

    const names = ownedMarketNames(this.lastInventoryRaw, (key) => this.gameData.get(key));
    const pending = this.market.pendingNames(names, force);
    if (pending.length === 0) return;

    await this.market.refresh(names, {
      force,
      onProgress: (p) => this.broadcastPriceProgress(p),
      onPriced: () => this.resolveAndPushInventory(),
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
}
