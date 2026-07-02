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
 * Durable fastest-clear-time tracker, deliberately independent of the
 * session XP/gold tracker: a stage's fastest clear time is a personal
 * record, not a session statistic, so it is NOT reset by "Reset session
 * stats" or the live-memory-toggle session reset. Persisted via its own
 * small file (`main/services/StageRunService.ts`), not `session_state.json`.
 */
export class StageRunTracker {
  private fastestByStageKey = new Map<number, number>();
  private lastByStageKey = new Map<number, number>();
  private countByStageKey = new Map<number, number>();
  private history: StageRunHistoryEntry[] = [];

  /** Record a live stage clear. Returns true when it beat the stage's prior fastest. */
  recordClear(stageKey: number, clearTimeSec: number, wallTime = nowSeconds()): boolean {
    if (stageKey <= 0 || clearTimeSec <= 0) return false;

    const prevFastest = this.fastestByStageKey.get(stageKey);
    const isFastest = prevFastest === undefined || clearTimeSec < prevFastest;
    if (isFastest) this.fastestByStageKey.set(stageKey, clearTimeSec);

    this.lastByStageKey.set(stageKey, clearTimeSec);
    this.countByStageKey.set(stageKey, (this.countByStageKey.get(stageKey) ?? 0) + 1);

    this.history.push({ wallTime, stageKey, clearTimeSec, isFastest });
    if (this.history.length > HISTORY_LIMIT) {
      this.history.splice(0, this.history.length - HISTORY_LIMIT);
    }

    return isFastest;
  }

  getStats(): StageRunStats {
    const rows: StageRunRow[] = [...this.fastestByStageKey.entries()].map(
      ([stageKey, fastest]) => ({
        stageKey,
        fastestClearTimeSec: fastest,
        lastClearTimeSec: this.lastByStageKey.get(stageKey) ?? fastest,
        clearCount: this.countByStageKey.get(stageKey) ?? 0,
      }),
    );
    rows.sort((a, b) => a.fastestClearTimeSec - b.fastestClearTimeSec);

    return {
      rows,
      history: this.history.slice(-HISTORY_VISIBLE).reverse(),
      readerRequired: true,
    };
  }

  captureSnapshot(): StageRunTrackerSnapshot {
    return {
      fastestByStageKey: Object.fromEntries(
        [...this.fastestByStageKey.entries()].map(([k, v]) => [String(k), v]),
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

    this.fastestByStageKey = toNumMap(data.fastestByStageKey ?? {});
    this.lastByStageKey = toNumMap(data.lastByStageKey ?? {});
    this.countByStageKey = toNumMap(data.countByStageKey ?? {});
    this.history = data.history ?? [];
  }
}
