import { expandPath } from "../config";
import { SaveWatcher } from "../saveWatcher";
import { buildStats } from "../stats";
import { makeHistoryLogger } from "../historyLog";
import { XpTracker } from "../../core/tracker";
import type { AppConfig, InventorySnapshot, SaveSnapshot } from "../../../shared/types";
import { IPC } from "../../../shared/ipc";
import { broadcast } from "./broadcast";

export class TrackingService {
  private tracker!: XpTracker;
  private watcher: SaveWatcher | null = null;
  private tickTimer: NodeJS.Timeout | null = null;
  private lastSnap: SaveSnapshot | null = null;
  private lastError: string | null = null;
  private config!: AppConfig;
  private readonly onInventory: (snap: InventorySnapshot) => void;
  private readonly parseInventorySnapshot?: (text: string, mtime: number) => InventorySnapshot;

  constructor(
    onInventory: (snap: InventorySnapshot) => void,
    parseInventorySnapshot?: (text: string, mtime: number) => InventorySnapshot,
  ) {
    this.onInventory = onInventory;
    this.parseInventorySnapshot = parseInventorySnapshot;
  }

  start(config: AppConfig): void {
    this.config = config;
    this.tracker = new XpTracker(config.rollingWindowMinutes * 60, config.trackCubeExp);
    if (config.logHistoryCsv) {
      this.tracker.onHistory = makeHistoryLogger();
    }
    this.watcher = this.createWatcher();
    this.watcher.start();
    this.tickTimer = setInterval(() => this.pushStats(), 1000);
  }

  stop(): void {
    if (this.tickTimer) clearInterval(this.tickTimer);
    this.tickTimer = null;
    this.watcher?.stop();
    this.watcher = null;
  }

  pushStats(): void {
    broadcast(IPC.STATS, this.getStats());
  }

  getStats() {
    return buildStats(this.tracker, this.lastSnap, this.lastError);
  }

  reset(): void {
    this.tracker.reset();
    this.pushStats();
  }

  getTracker(): XpTracker {
    return this.tracker;
  }

  setTracker(tracker: XpTracker): void {
    this.tracker = tracker;
  }

  updateConfig(config: AppConfig): void {
    this.config = config;
  }

  restartWatcher(): void {
    this.watcher?.stop();
    this.watcher = this.createWatcher();
    this.watcher.start();
  }

  private createWatcher(): SaveWatcher {
    return new SaveWatcher({
      path: expandPath(this.config.savePath),
      password: this.config.es3Password,
      pollMs: Math.max(1, this.config.pollIntervalSeconds) * 1000,
      onSnapshot: (snap) => {
        this.lastSnap = snap;
        this.lastError = null;
        this.tracker.update(snap);
        this.pushStats();
      },
      onError: (message) => {
        this.lastError = message;
        this.pushStats();
      },
      onInventory: this.onInventory,
      parseInventorySnapshot: this.parseInventorySnapshot,
    });
  }
}
