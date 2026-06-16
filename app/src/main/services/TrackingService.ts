import { expandPath } from "../config";
import { SaveWatcher } from "../saveWatcher";
import { PlayerLogWatcher } from "../playerLogWatcher";
import { playerLogPathFromSave } from "../../core/playerLog";
import { buildStats } from "../stats";
import { makeHistoryLogger } from "../historyLog";
import { XpTracker } from "../../core/tracker";
import { ChestDropTracker } from "../../core/chestDropTracker";
import type { AppConfig, InventorySnapshot, SaveSnapshot } from "../../../shared/types";
import { IPC } from "../../../shared/ipc";
import { broadcast } from "./broadcast";
import { detectHeroLevelUps, type HeroLevelUpEvent } from "../../core/heroes/detectLevelUps";
import { createLogger } from "../log";
import type { SessionStateService } from "./SessionStateService";

const log = createLogger("tracking");

const PLAYER_LOG_POLL_MS = 1000;

export interface PlayerLogHooks {
  onDrop: (itemKey: number) => void;
  onAvailability: (path: string, available: boolean) => void;
}

export class TrackingService {
  private tracker!: XpTracker;
  private chestDropTracker!: ChestDropTracker;
  private playerLogAvailable = false;
  private watcher: SaveWatcher | null = null;
  private playerLogWatcher: PlayerLogWatcher | null = null;
  private tickTimer: NodeJS.Timeout | null = null;
  private lastSnap: SaveSnapshot | null = null;
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
    private readonly playerLog?: PlayerLogHooks,
    private readonly onHeroLevelUp?: (events: HeroLevelUpEvent[]) => void,
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
    this.playerLogWatcher = this.createPlayerLogWatcher();
    this.playerLogWatcher.start();
    this.tickTimer = setInterval(() => this.pushStats(), 1000);
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
    this.playerLogWatcher?.stop();
    this.playerLogWatcher = null;
  }

  pushStats(): void {
    broadcast(IPC.STATS, this.getStats());
  }

  getStats() {
    return buildStats(
      this.tracker,
      this.chestDropTracker,
      this.playerLogAvailable,
      this.lastSnap,
      this.lastError,
      this.sessionState?.getStatusOverride() ?? null,
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
    this.restartPlayerLogWatcher();
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
    this.restartPlayerLogWatcher();
  }

  onChestLogDrop(itemKey: number): void {
    if (this.chestDropTracker.recordLogDrop(itemKey)) {
      this.pushStats();
    }
  }

  private restartPlayerLogWatcher(): void {
    this.playerLogWatcher?.stop();
    this.playerLogWatcher = this.createPlayerLogWatcher();
    this.playerLogWatcher.start();
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

  private createPlayerLogWatcher(): PlayerLogWatcher {
    const savePath = expandPath(this.config.savePath);
    const path = playerLogPathFromSave(savePath);
    return new PlayerLogWatcher({
      path,
      pollMs: PLAYER_LOG_POLL_MS,
      onDrop: (itemKey) => {
        this.onChestLogDrop(itemKey);
        this.playerLog?.onDrop(itemKey);
      },
      onAvailability: (available) => {
        this.playerLogAvailable = available;
        this.playerLog?.onAvailability(path, available);
        this.pushStats();
      },
    });
  }
}
