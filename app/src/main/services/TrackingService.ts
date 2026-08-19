import { expandPath } from "../config";
import { SaveWatcher } from "../saveWatcher";
import { buildStats } from "../stats";
import { makeHistoryLogger } from "../historyLog";
import { XpTracker } from "../../core/tracker";
import { ChestDropTracker } from "../../core/chestDropTracker";
import type {
  AppConfig,
  InventorySnapshot,
  LiveMemorySnapshot,
  SaveSnapshot,
} from "../../../shared/types";
import { IPC } from "../../../shared/ipc";
import { broadcast } from "./broadcast";
import { detectHeroLevelUps, type HeroLevelUpEvent } from "../../core/heroes/detectLevelUps";
import { createLogger } from "../log";
import type { SessionStateService } from "./SessionStateService";

const log = createLogger("tracking");

/** Live-memory frames arrive at ~25 Hz; the UI doesn't need a broadcast that often. */
const LIVE_BROADCAST_INTERVAL_MS = 200;

export class TrackingService {
  private tracker!: XpTracker;
  private chestDropTracker!: ChestDropTracker;
  private watcher: SaveWatcher | null = null;
  private tickTimer: NodeJS.Timeout | null = null;
  private lastSnap: SaveSnapshot | null = null;
  private lastLiveFrame: LiveMemorySnapshot | null = null;
  private lastLiveBroadcastMs = 0;
  private lastError: string | null = null;
  private config!: AppConfig;
  private restoreApplied = false;
  private readonly onInventory: (snap: InventorySnapshot) => void;
  private readonly parseInventorySnapshot?: (text: string, mtime: number) => InventorySnapshot;

  constructor(
    onInventory: (snap: InventorySnapshot) => void,
    parseInventorySnapshot?: (text: string, mtime: number) => InventorySnapshot,
    private readonly onStageKey?: (stageKey: number) => void,
    private readonly sessionState?: SessionStateService,
    private readonly onHeroLevelUp?: (events: HeroLevelUpEvent[]) => void,
    private readonly onLiveStageBossDrop?: (stageKey: number) => void,
  ) {
    this.onInventory = onInventory;
    this.parseInventorySnapshot = parseInventorySnapshot;
  }

  start(config: AppConfig): void {
    this.config = config;
    this.tracker = new XpTracker(config.rollingWindowMinutes * 60);
    this.chestDropTracker = new ChestDropTracker();
    if (config.logHistoryCsv) {
      this.tracker.onHistory = makeHistoryLogger();
    }
    this.restoreApplied = false;
    this.watcher = this.createWatcher();
    this.watcher.start();
    this.tickTimer = setInterval(() => {
      // Skip the redundant push if a live-memory frame already broadcast recently —
      // avoids the 1 Hz safety-net tick doubling up with the ~5 Hz live broadcast.
      if (Date.now() - this.lastLiveBroadcastMs < LIVE_BROADCAST_INTERVAL_MS) return;
      this.pushStats();
    }, 1000);
    this.sessionState?.startAutosave(() => ({
      tracker: this.tracker,
      chestDropTracker: this.chestDropTracker,
      lastSnap: this.lastSnap,
      config: this.config,
    }));
  }

  stop(): void {
    this.sessionState?.stopAutosave();
    if (this.tickTimer) clearInterval(this.tickTimer);
    this.tickTimer = null;
    this.watcher?.stop();
    this.watcher = null;
  }

  pushStats(): void {
    broadcast(IPC.STATS, this.getStats());
  }

  getStats() {
    return buildStats(
      this.tracker,
      this.chestDropTracker,
      this.lastSnap,
      this.lastError,
      this.sessionState?.getStatusOverride() ?? null,
      this.lastLiveFrame,
    );
  }

  reset(): void {
    this.tracker.reset();
    this.chestDropTracker.reset();
    this.sessionState?.onTrackerReset(
      this.tracker,
      this.chestDropTracker,
      this.config,
      this.lastSnap,
    );
    this.pushStats();
  }

  flushSession(): void {
    this.sessionState?.flush(this.tracker, this.chestDropTracker, this.lastSnap, this.config);
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
    this.sessionState?.invalidatePending();
    this.restoreApplied = false;
    this.watcher?.stop();
    this.watcher = this.createWatcher();
    this.watcher.start();
  }

  onSessionFileDeleted(): void {
    this.sessionState?.onFileDeleted();
  }

  onSavePathChanged(): void {
    this.lastSnap = null;
    this.restoreApplied = false;
    this.sessionState?.invalidatePending();
    this.tracker.reset();
    this.chestDropTracker.reset();
    this.sessionState?.notifyNewSession();
    this.sessionState?.onTrackerReset(this.tracker, this.chestDropTracker, this.config, null);
    this.pushStats();
  }

  /**
   * Reset session stats when switching between live-memory and save-only tracking.
   * Save-layer and runtime values use different baselines, so totals must not carry over.
   */
  onLiveMemoryToggled(): void {
    this.lastLiveFrame = null;
    this.tracker.reset();
    this.chestDropTracker.reset();
    if (this.lastSnap) {
      this.tracker.update(this.lastSnap);
    }
    this.sessionState?.notifyNewSession();
    this.sessionState?.onTrackerReset(
      this.tracker,
      this.chestDropTracker,
      this.config,
      this.lastSnap,
    );
    this.pushStats();
  }

  /**
   * Ingest a live-memory snapshot frame into the tracker.
   * Called at ~25 Hz from LiveMemoryService; broadcasts to the renderer are throttled
   * to LIVE_BROADCAST_INTERVAL_MS (tracker sampling itself stays at full rate).
   */
  ingestLiveFrame(snap: LiveMemorySnapshot): void {
    if (!snap.connected) return;
    this.lastLiveFrame = snap;

    const stage =
      snap.stageKey != null
        ? { stageKey: snap.stageKey, stageWave: snap.stageWave ?? 0 }
        : undefined;

    this.tracker.updateLive({ gold: snap.gold, heroes: snap.heroes }, snap.at / 1000, stage);

    if (snap.chestDrops && snap.chestDrops.length > 0) {
      for (const category of snap.chestDrops) {
        if (this.chestDropTracker.recordLiveChestDrop(category, snap.at / 1000)) {
          if (category === "rare" && snap.stageKey != null && snap.stageKey > 0) {
            this.onLiveStageBossDrop?.(snap.stageKey);
          }
        }
      }
    }

    // Tracker ingestion above stays at full ~25 Hz for accurate rate sampling;
    // only the renderer broadcast is throttled to cut re-render/IPC pressure.
    const now = Date.now();
    if (now - this.lastLiveBroadcastMs >= LIVE_BROADCAST_INTERVAL_MS) {
      this.lastLiveBroadcastMs = now;
      this.pushStats();
    }
  }

  private createWatcher(): SaveWatcher {
    const savePath = expandPath(this.config.savePath);
    const pollMs = Math.max(1, this.config.pollIntervalSeconds) * 1000;
    log.info(`Save watcher started (poll ${pollMs / 1000}s, path ${savePath})`);
    return new SaveWatcher({
      path: savePath,
      password: this.config.es3Password,
      pollMs,
      onSnapshot: (snap) => {
        if (this.lastSnap) {
          const levelUps = detectHeroLevelUps(this.lastSnap.heroes, snap.heroes);
          if (levelUps.length > 0) {
            this.onHeroLevelUp?.(levelUps);
          }
        }
        this.lastSnap = snap;
        this.lastError = null;
        if (!this.restoreApplied && this.sessionState) {
          this.sessionState.tryRestoreOnSnapshot(this.tracker, this.chestDropTracker, snap);
          this.restoreApplied = true;
        }
        this.tracker.update(snap);
        this.onStageKey?.(snap.stageKey);
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
