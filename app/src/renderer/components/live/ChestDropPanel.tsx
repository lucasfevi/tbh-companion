import type { ChestDropBreakdownRow, ChestDropStats } from "../../../../shared/types";
import { DataListRow } from "../ui/DataList";
import { HintBanner } from "../ui/HintBanner";
import { PanelSection } from "../ui/PanelSection";
import { fmtClock } from "../../lib/format";
import { cn } from "../../lib/cn";
import { LiveHistoryPanel } from "./LiveHistoryPanel";
import { LiveMatchedPair } from "./LiveMatchedPair";
import { LivePanelList } from "./LivePanelList";

function ChestCategoryRows({
  rows,
  countClassName,
}: {
  rows: ChestDropBreakdownRow[];
  countClassName?: string;
}) {
  return (
    <LivePanelList empty={rows.length === 0 ? "None yet" : undefined}>
      {rows.map((row, i) => (
        <DataListRow
          key={row.itemKey}
          index={i}
          className="grid grid-cols-[1fr_auto] items-center gap-3"
        >
          <span className="min-w-0 truncate">{row.name}</span>
          <span className={cn("tabular-nums font-semibold", countClassName ?? "text-fg")}>
            ×{row.count.toLocaleString()}
          </span>
        </DataListRow>
      ))}
    </LivePanelList>
  );
}

export function ChestDropPanel({ chestDrops }: { chestDrops: ChestDropStats }) {
  const { breakdown, history, playerLogAvailable } = chestDrops;
  const common = breakdown.filter((row) => row.category === "common");
  const rare = breakdown.filter((row) => row.category === "rare");

  return (
    <>
      {!playerLogAvailable ? (
        <HintBanner className={cn("border-l-muted text-muted")}>
          Player.log not found beside your save. Launch the game with the companion open to track
          drops.
        </HintBanner>
      ) : null}

      <LiveMatchedPair
        left={
          <>
            <PanelSection title="Common Chests" boxed>
              <ChestCategoryRows rows={common} />
            </PanelSection>
            <PanelSection title="Stage Boss Chests" boxed>
              <ChestCategoryRows rows={rare} countClassName="text-status-info" />
            </PanelSection>
          </>
        }
        right={
          <LiveHistoryPanel
            title="Chest history"
            empty={
              history.length === 0 ? (
                <p className="m-0">No drops logged yet this session.</p>
              ) : undefined
            }
          >
            {history.map((entry, i) => (
              <DataListRow
                key={`${entry.wallTime}-${entry.itemKey}-${i}`}
                index={i}
                className="grid grid-cols-[auto_1fr] items-center gap-3"
              >
                <span className="shrink-0 tabular-nums text-muted">{fmtClock(entry.wallTime)}</span>
                <span
                  className={cn(
                    "min-w-0 truncate",
                    entry.category === "rare" ? "text-status-info" : "text-fg",
                  )}
                >
                  {entry.name}
                </span>
              </DataListRow>
            ))}
          </LiveHistoryPanel>
        }
      />
    </>
  );
}
