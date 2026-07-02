import type {
  StageRunHistoryEntry,
  StageRunRow,
  StageRunStats,
  StageRunTrackerSnapshot,
} from "../../shared/types";

const HISTORY_LIMIT = 200;
const HISTORY_VISIBLE = 20;

function nowSeconds(): number {
  return Date.now() / 1000;
}

/**
 * Durable best-farm clear-time tracker, deliberately independent of the
 * session XP/gold tracker: personal-best clear times are a record, not a
 * session statistic, so they are NOT reset by "Reset session stats" or the
 * live-memory-toggle session reset. Persisted via its own small file
 * (`main/services/StageRunService.ts`), not `session_state.json`.
 */
export class StageRunTracker {
  private bestByStageKey = new Map<number, number>();
  private lastByStageKey = new Map<number, number>();
  private countByStageKey = new Map<number, number>();
  private history: StageRunHistoryEntry[] = [];

  /** Record a live stage clear. Returns true when it beat the stage's prior best. */
  recordClear(stageKey: number, clearTimeSec: number, wallTime = nowSeconds()): boolean {
    if (stageKey <= 0 || clearTimeSec <= 0) return false;

    const prevBest = this.bestByStageKey.get(stageKey);
    const isBest = prevBest === undefined || clearTimeSec < prevBest;
    if (isBest) this.bestByStageKey.set(stageKey, clearTimeSec);

    this.lastByStageKey.set(stageKey, clearTimeSec);
    this.countByStageKey.set(stageKey, (this.countByStageKey.get(stageKey) ?? 0) + 1);

    this.history.push({ wallTime, stageKey, clearTimeSec, isBest });
    if (this.history.length > HISTORY_LIMIT) {
      this.history.splice(0, this.history.length - HISTORY_LIMIT);
    }

    return isBest;
  }

  getStats(): StageRunStats {
    const rows: StageRunRow[] = [...this.bestByStageKey.entries()].map(([stageKey, best]) => ({
      stageKey,
      bestClearTimeSec: best,
      lastClearTimeSec: this.lastByStageKey.get(stageKey) ?? best,
      clearCount: this.countByStageKey.get(stageKey) ?? 0,
    }));
    rows.sort((a, b) => a.bestClearTimeSec - b.bestClearTimeSec);

    return {
      rows,
      history: this.history.slice(-HISTORY_VISIBLE).reverse(),
      readerRequired: true,
    };
  }

  captureSnapshot(): StageRunTrackerSnapshot {
    return {
      bestByStageKey: Object.fromEntries(
        [...this.bestByStageKey.entries()].map(([k, v]) => [String(k), v]),
      ),
      lastByStageKey: Object.fromEntries(
        [...this.lastByStageKey.entries()].map(([k, v]) => [String(k), v]),
      ),
      countByStageKey: Object.fromEntries(
        [...this.countByStageKey.entries()].map(([k, v]) => [String(k), v]),
      ),
      history: [...this.history],
    };
  }

  applySnapshot(data: StageRunTrackerSnapshot): void {
    const toNumMap = (rec: Record<string, number>): Map<number, number> => {
      const m = new Map<number, number>();
      for (const [k, v] of Object.entries(rec)) {
        const key = Number(k);
        if (Number.isFinite(key) && Number.isFinite(v)) m.set(key, v);
      }
      return m;
    };

    this.bestByStageKey = toNumMap(data.bestByStageKey ?? {});
    this.lastByStageKey = toNumMap(data.lastByStageKey ?? {});
    this.countByStageKey = toNumMap(data.countByStageKey ?? {});
    this.history = data.history ?? [];
  }
}
