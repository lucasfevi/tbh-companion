import { app } from "electron";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  isPersistedSessionState,
  sessionMatchesConfig,
  snapshotContinuesSession,
} from "../../core/sessionState";
import type { XpTracker } from "../../core/tracker";
import type { ChestDropTracker } from "../../core/chestDropTracker";
import type {
  AppConfig,
  ChestDropTrackerSnapshot,
  PersistedSessionState,
  SaveSnapshot,
  SessionUiSnapshot,
  TrackerSnapshot,
} from "../../../shared/types";
import { expandPath } from "../config";
import { SESSION_STATE_FILE } from "./appData";
import { createLogger } from "../log";

const log = createLogger("session");
const SAVE_INTERVAL_MS = 15_000;
const STATUS_CLEAR_MS = 60_000;

export type SessionRestoreResult = "restored" | "fresh" | "discarded";

export class SessionStateService {
  private pendingTracker: TrackerSnapshot | null = null;
  private pendingChestDropTracker: ChestDropTrackerSnapshot | null = null;
  private pendingLastSaveMtime: number | null = null;
  private lastSaveMtime: number | null = null;
  private saveTimer: NodeJS.Timeout | null = null;
  private statusClearTimer: NodeJS.Timeout | null = null;
  private statusOverride: string | null = null;
  private ui: SessionUiSnapshot = { miniOverlayOpen: false, boxTrackerOpen: false };
  private savePath = "";

  load(config: AppConfig): SessionUiSnapshot {
    this.savePath = expandPath(config.savePath);
    this.pendingTracker = null;
    this.pendingChestDropTracker = null;
    this.pendingLastSaveMtime = null;
    this.lastSaveMtime = null;

    const path = this.filePath();
    if (!existsSync(path)) return { ...this.ui };

    try {
      const raw = JSON.parse(readFileSync(path, "utf-8")) as unknown;
      if (!isPersistedSessionState(raw)) {
        log.warn("Ignoring invalid session_state.json");
        return { ...this.ui };
      }

      this.ui = {
        miniOverlayOpen: raw.ui.miniOverlayOpen,
        boxTrackerOpen: raw.ui.boxTrackerOpen,
      };

      if (!sessionMatchesConfig(raw, this.savePath, config)) {
        log.info("Session snapshot ignored (save path or tracking settings changed)");
        return { ...this.ui };
      }

      this.pendingTracker = raw.tracker;
      this.pendingChestDropTracker = raw.chestDropTracker ?? null;
      this.pendingLastSaveMtime = raw.lastSaveMtime;
      this.lastSaveMtime = raw.lastSaveMtime;
      log.info("Session snapshot loaded; waiting for save read to restore");
      return { ...this.ui };
    } catch (err) {
      log.warn(`Could not read session snapshot: ${(err as Error).message}`);
      return { ...this.ui };
    }
  }

  startAutosave(
    getContext: () => {
      tracker: XpTracker;
      chestDropTracker: ChestDropTracker;
      lastSnap: SaveSnapshot | null;
      config: AppConfig;
    },
  ): void {
    this.stopAutosave();
    this.saveTimer = setInterval(() => {
      const ctx = getContext();
      this.persist(ctx.tracker, ctx.chestDropTracker, ctx.lastSnap, ctx.config);
    }, SAVE_INTERVAL_MS);
  }

  stopAutosave(): void {
    if (this.saveTimer) clearInterval(this.saveTimer);
    this.saveTimer = null;
  }

  /** Apply pending tracker restore on the first save snapshot (or discard if stale). */
  tryRestoreOnSnapshot(
    tracker: XpTracker,
    chestDropTracker: ChestDropTracker,
    snap: SaveSnapshot,
  ): SessionRestoreResult {
    if (!this.pendingTracker || this.pendingLastSaveMtime === null) {
      this.lastSaveMtime = snap.saveMtime;
      return "fresh";
    }

    if (!snapshotContinuesSession(this.pendingLastSaveMtime, snap)) {
      log.info(
        `Session discarded (save mtime ${snap.saveMtime} < snapshot ${this.pendingLastSaveMtime})`,
      );
      this.pendingTracker = null;
      this.pendingChestDropTracker = null;
      this.pendingLastSaveMtime = null;
      this.lastSaveMtime = snap.saveMtime;
      this.setStatusOverride("New session");
      this.deleteFile();
      return "discarded";
    }

    tracker.applySnapshot(this.pendingTracker);
    if (this.pendingChestDropTracker) {
      chestDropTracker.applySnapshot(this.pendingChestDropTracker);
    }
    this.pendingTracker = null;
    this.pendingChestDropTracker = null;
    this.pendingLastSaveMtime = null;
    this.lastSaveMtime = snap.saveMtime;
    log.info("Session stats restored from snapshot");
    return "restored";
  }

  persist(
    tracker: XpTracker,
    chestDropTracker: ChestDropTracker,
    lastSnap: SaveSnapshot | null,
    config: AppConfig,
  ): void {
    const mtime = lastSnap?.saveMtime ?? this.lastSaveMtime;
    if (mtime === null && !tracker.isInitialized && this.pendingTracker === null) return;

    this.savePath = expandPath(config.savePath);
    const storedMtime = mtime ?? 0;
    if (mtime !== null) this.lastSaveMtime = mtime;

    const payload: PersistedSessionState = {
      version: 1,
      savePath: this.savePath,
      lastSaveMtime: storedMtime,
      rollingWindowMinutes: config.rollingWindowMinutes,
      tracker: tracker.captureSnapshot(),
      chestDropTracker: chestDropTracker.captureSnapshot(),
      ui: { ...this.ui },
    };

    try {
      const path = this.filePath();
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, JSON.stringify(payload, null, 2));
    } catch (err) {
      log.warn(`Session persist failed: ${(err as Error).message}`);
    }
  }

  clearSession(tracker: XpTracker, chestDropTracker: ChestDropTracker, config: AppConfig): void {
    this.pendingTracker = null;
    this.pendingChestDropTracker = null;
    this.pendingLastSaveMtime = null;
    this.lastSaveMtime = null;
    this.statusOverride = null;
    this.clearStatusTimer();
    tracker.reset();
    chestDropTracker.reset();
    this.persist(tracker, chestDropTracker, null, config);
  }

  invalidatePending(): void {
    this.pendingTracker = null;
    this.pendingChestDropTracker = null;
    this.pendingLastSaveMtime = null;
  }

  setMiniOverlayOpen(open: boolean): void {
    if (this.ui.miniOverlayOpen === open) return;
    this.ui.miniOverlayOpen = open;
  }

  setBoxTrackerOpen(open: boolean): void {
    if (this.ui.boxTrackerOpen === open) return;
    this.ui.boxTrackerOpen = open;
  }

  getUiSnapshot(): SessionUiSnapshot {
    return { ...this.ui };
  }

  getStatusOverride(): string | null {
    return this.statusOverride;
  }

  notifyNewSession(): void {
    this.setStatusOverride("New session");
  }

  flush(
    tracker: XpTracker,
    chestDropTracker: ChestDropTracker,
    lastSnap: SaveSnapshot | null,
    config: AppConfig,
  ): void {
    this.persist(tracker, chestDropTracker, lastSnap, config);
  }

  onTrackerReset(
    tracker: XpTracker,
    chestDropTracker: ChestDropTracker,
    config: AppConfig,
    lastSnap: SaveSnapshot | null,
  ): void {
    this.pendingTracker = null;
    this.pendingChestDropTracker = null;
    this.pendingLastSaveMtime = null;
    this.statusOverride = null;
    this.clearStatusTimer();
    if (lastSnap) {
      this.lastSaveMtime = lastSnap.saveMtime;
    }
    this.persist(tracker, chestDropTracker, lastSnap, config);
  }

  onFileDeleted(): void {
    this.pendingTracker = null;
    this.pendingChestDropTracker = null;
    this.pendingLastSaveMtime = null;
    this.lastSaveMtime = null;
    this.statusOverride = null;
    this.clearStatusTimer();
  }

  private setStatusOverride(message: string): void {
    this.statusOverride = message;
    this.clearStatusTimer();
    this.statusClearTimer = setTimeout(() => {
      this.statusOverride = null;
      this.statusClearTimer = null;
    }, STATUS_CLEAR_MS);
  }

  private clearStatusTimer(): void {
    if (this.statusClearTimer) clearTimeout(this.statusClearTimer);
    this.statusClearTimer = null;
  }

  private filePath(): string {
    try {
      return join(app.getPath("userData"), SESSION_STATE_FILE);
    } catch {
      return join(process.cwd(), SESSION_STATE_FILE);
    }
  }

  private deleteFile(): void {
    const path = this.filePath();
    if (!existsSync(path)) return;
    try {
      unlinkSync(path);
    } catch (err) {
      log.warn(`Could not delete session snapshot: ${(err as Error).message}`);
    }
  }
}
