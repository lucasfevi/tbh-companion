import { app } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { StageRunTracker } from "../../core/stageRunTracker";
import type { StageRunStats, StageRunTrackerSnapshot } from "../../../shared/types";
import { IPC } from "../../../shared/ipc";
import { broadcast } from "./broadcast";
import { STAGE_RUN_FILE } from "./appData";
import { createLogger } from "../log";

const log = createLogger("stageRuns");

/**
 * Durable stage-clear-history storage, independent of `session_state.json`
 * (see `core/stageRunTracker.ts` for why). Mirrors `BoxTimerService`'s simple
 * load-once / persist-on-change pattern — writes are rare (one per stage
 * clear), so synchronous `writeFileSync` on each change is fine.
 */
export class StageRunService {
  private readonly tracker = new StageRunTracker();

  constructor() {
    this.load();
  }

  /** Record a live stage clear (duration + XP/gold gained since the previous recorded clear). */
  recordClear(stageKey: number, clearTimeSec: number, xpGained: number, goldGained: number): void {
    this.tracker.recordClear(stageKey, clearTimeSec, xpGained, goldGained);
    this.persist();
    this.push();
  }

  getStats(): StageRunStats {
    return this.tracker.getStats();
  }

  /** Clear in-memory history after stage_run_history.json was deleted from Settings. */
  resetStorage(): void {
    this.tracker.applySnapshot({ history: [] });
    this.push();
  }

  push(): void {
    broadcast(IPC.STAGE_RUNS, this.tracker.getStats());
  }

  private persistPath(): string {
    try {
      return join(app.getPath("userData"), STAGE_RUN_FILE);
    } catch {
      return join(process.cwd(), STAGE_RUN_FILE);
    }
  }

  private load(): void {
    const path = this.persistPath();
    if (!existsSync(path)) return;
    try {
      const raw = JSON.parse(readFileSync(path, "utf-8")) as StageRunTrackerSnapshot;
      this.tracker.applySnapshot(raw);
    } catch (err) {
      log.warn(`Could not read stage_run_history.json: ${(err as Error).message}`);
    }
  }

  private persist(): void {
    try {
      const path = this.persistPath();
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, JSON.stringify(this.tracker.captureSnapshot(), null, 2));
    } catch (err) {
      log.warn(`Stage run persist failed: ${(err as Error).message}`);
    }
  }
}
