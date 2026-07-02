import type {
  StageRunHistoryEntry,
  StageRunStats,
  StageRunTrackerSnapshot,
} from "../../shared/types";

const HISTORY_LIMIT = 200;
const HISTORY_VISIBLE = 20;

function nowSeconds(): number {
  return Date.now() / 1000;
}

/**
 * Durable per-run stage-clear history (duration + XP/gold gained), deliberately
 * independent of the session XP/gold tracker: it's a record of past runs, not a
 * session statistic, so it is NOT reset by "Reset session stats" or the
 * live-memory-toggle session reset. Persisted via its own small file
 * (`main/services/StageRunService.ts`), not `session_state.json`. Raw material
 * for a future "which stage is best to farm" feature — this tracker only
 * records, it does not rank or aggregate.
 */
export class StageRunTracker {
  private history: StageRunHistoryEntry[] = [];

  /** Record a live stage clear (duration + XP/gold gained since the previous recorded clear). */
  recordClear(
    stageKey: number,
    clearTimeSec: number,
    xpGained: number,
    goldGained: number,
    wallTime = nowSeconds(),
  ): void {
    if (stageKey <= 0 || clearTimeSec <= 0) return;

    this.history.push({
      wallTime,
      stageKey,
      clearTimeSec,
      xpGained: Math.max(0, xpGained),
      goldGained: Math.max(0, goldGained),
    });
    if (this.history.length > HISTORY_LIMIT) {
      this.history.splice(0, this.history.length - HISTORY_LIMIT);
    }
  }

  getStats(): StageRunStats {
    return {
      history: this.history.slice(-HISTORY_VISIBLE).reverse(),
      readerRequired: true,
    };
  }

  captureSnapshot(): StageRunTrackerSnapshot {
    return { history: [...this.history] };
  }

  applySnapshot(data: StageRunTrackerSnapshot): void {
    this.history = data.history ?? [];
  }
}
