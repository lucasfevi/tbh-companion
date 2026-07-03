import type { StageRunStats } from "../../../../shared/types";
import { fmtClock, fmtCompact, fmtShortDuration } from "../../lib/format";
import { stageName } from "../../../core/stages";
import { useEntityPanel } from "../../context/entityPanelContext";
import { ItemLink } from "../ItemLink";
import { LiveHistoryPanel, LiveHistoryRow, TIME_COLUMN_WIDTH } from "./LiveHistoryPanel";

const COLUMNS = [
  { label: "Cleared at", width: TIME_COLUMN_WIDTH },
  { label: "Stage" },
  { label: "Clear time", align: "right" as const, width: "80px" },
  { label: "XP", align: "right" as const, width: "88px" },
  { label: "Gold", align: "right" as const, width: "80px" },
];

/**
 * Per-run stage-clear log: duration + XP/gold gained since the previous
 * recorded clear. Raw material for a future "which stage is best to farm"
 * feature — this panel only lists runs, it doesn't rank or aggregate them.
 */
export function StageRunPanel({ stageRuns }: { stageRuns: StageRunStats }) {
  const { history } = stageRuns;
  const { open } = useEntityPanel();

  return (
    <LiveHistoryPanel
      title="Stage clear history"
      columns={COLUMNS}
      empty={history.length === 0 ? <p className="m-0">No stage clears logged yet.</p> : undefined}
    >
      {history.map((entry, i) => (
        <LiveHistoryRow
          key={`${entry.wallTime}-${entry.stageKey}-${i}`}
          index={i}
          cells={[
            {
              content: fmtClock(entry.wallTime),
              className: "tabular-nums text-muted whitespace-nowrap",
            },
            {
              content: (
                <ItemLink
                  node={{ type: "stage", id: entry.stageKey }}
                  name={stageName(entry.stageKey)}
                  onNavigate={open}
                />
              ),
              className: "min-w-0",
            },
            {
              content: fmtShortDuration(entry.clearTimeSec),
              align: "right",
              className: "tabular-nums text-muted",
            },
            {
              content: `+${fmtCompact(entry.xpGained)}`,
              align: "right",
              className: "tabular-nums text-accent",
            },
            {
              content: `+${fmtCompact(entry.goldGained)}`,
              align: "right",
              className: "tabular-nums text-gold",
            },
          ]}
        />
      ))}
    </LiveHistoryPanel>
  );
}
