import type { StageRunStats } from "../../../../shared/types";
import { DataListRow } from "../../design-system/primitives/DataList/DataList";
import { fmtClock, fmtCompact, fmtDuration } from "../../lib/format";
import { stageName } from "../../../core/stages";
import { LiveHistoryPanel } from "./LiveHistoryPanel";

/**
 * Per-run stage-clear log: duration + XP/gold gained since the previous
 * recorded clear. Raw material for a future "which stage is best to farm"
 * feature — this panel only lists runs, it doesn't rank or aggregate them.
 */
export function StageRunPanel({ stageRuns }: { stageRuns: StageRunStats }) {
  const { history } = stageRuns;

  return (
    <LiveHistoryPanel
      title="Stage clear history"
      empty={
        history.length === 0 ? <p className="m-0">No clears logged yet this session.</p> : undefined
      }
    >
      {history.map((entry, i) => (
        <DataListRow
          key={`${entry.wallTime}-${entry.stageKey}-${i}`}
          index={i}
          className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3"
        >
          <span className="shrink-0 tabular-nums text-muted">{fmtClock(entry.wallTime)}</span>
          <span className="min-w-0 truncate">{stageName(entry.stageKey)}</span>
          <span className="tabular-nums text-muted">{fmtDuration(entry.clearTimeSec)}</span>
          <span className="tabular-nums text-accent">+{fmtCompact(entry.xpGained)} xp</span>
          <span className="tabular-nums text-gold">+{fmtCompact(entry.goldGained)}</span>
        </DataListRow>
      ))}
    </LiveHistoryPanel>
  );
}
