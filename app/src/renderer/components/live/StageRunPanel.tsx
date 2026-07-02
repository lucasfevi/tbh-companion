import type { StageRunStats } from "../../../../shared/types";
import { DataListRow } from "../../design-system/primitives/DataList/DataList";
import { HintBanner } from "../../design-system/primitives/HintBanner/HintBanner";
import { PanelSection } from "../../design-system/primitives/PanelSection/PanelSection";
import { fmtClock, fmtDuration } from "../../lib/format";
import { stageName } from "../../../core/stages";
import { LiveMatchedPair } from "./LiveMatchedPair";
import { LivePanelList } from "./LivePanelList";

const FASTEST_TIMES_VISIBLE = 8;

export function StageRunPanel({
  stageRuns,
  inactiveMessage,
}: {
  stageRuns: StageRunStats;
  /** When set, stage-clear tracking is inactive — explain why the panel is empty. */
  inactiveMessage?: string | null;
}) {
  const { rows, history } = stageRuns;
  const fastestRows = rows.slice(0, FASTEST_TIMES_VISIBLE);

  return (
    <>
      {inactiveMessage ? <HintBanner>{inactiveMessage}</HintBanner> : null}
      <LiveMatchedPair
        left={
          <PanelSection title="Fastest clear times" boxed>
            <LivePanelList
              empty={
                fastestRows.length === 0
                  ? inactiveMessage
                    ? "No clears tracked this session."
                    : "No clears logged yet this session."
                  : undefined
              }
            >
              {fastestRows.map((row, i) => (
                <DataListRow
                  key={row.stageKey}
                  index={i}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-3"
                >
                  <span className="min-w-0 truncate">{stageName(row.stageKey)}</span>
                  <span className="tabular-nums font-semibold text-fg">
                    {fmtDuration(row.fastestClearTimeSec)}
                  </span>
                  <span className="tabular-nums text-muted">×{row.clearCount}</span>
                </DataListRow>
              ))}
            </LivePanelList>
          </PanelSection>
        }
        right={
          <PanelSection title="Recent clears" boxed>
            <LivePanelList empty={history.length === 0 ? "None yet" : undefined}>
              {history.map((entry, i) => (
                <DataListRow
                  key={`${entry.wallTime}-${entry.stageKey}-${i}`}
                  index={i}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3"
                >
                  <span className="shrink-0 tabular-nums text-muted">
                    {fmtClock(entry.wallTime)}
                  </span>
                  <span className="min-w-0 truncate">{stageName(entry.stageKey)}</span>
                  <span
                    className={
                      entry.isFastest
                        ? "tabular-nums font-semibold text-status-info"
                        : "tabular-nums text-fg"
                    }
                  >
                    {fmtDuration(entry.clearTimeSec)}
                    {entry.isFastest ? " fastest" : ""}
                  </span>
                </DataListRow>
              ))}
            </LivePanelList>
          </PanelSection>
        }
      />
    </>
  );
}
