import type { ChestDropBreakdownRow, ChestDropStats } from "../../../../shared/types";
import { DataList, DataListRow } from "../ui/DataList";
import { HintBanner } from "../ui/HintBanner";
import { PanelSection } from "../ui/PanelSection";
import { fmtCompact, fmtClock } from "../../lib/format";
import { cn } from "../../lib/cn";
import { LiveSideBySide } from "./LiveSideBySide";

const RATE_TIP =
  "Drop rates from Player.log lines this session. Only counts while the companion is running.";

function ChestDropSummary({ chestDrops }: { chestDrops: ChestDropStats }) {
  const { commonTotal, rareTotal, commonPerHour, rarePerHour, combinedTotal } = chestDrops;

  if (combinedTotal === 0) return null;

  return (
    <p
      className="m-0 mb-2.5 cursor-help border-b border-border pb-2 text-[13px] leading-relaxed"
      title={RATE_TIP}
    >
      <span className="tabular-nums">
        <span className="font-semibold text-fg">{commonTotal.toLocaleString()}</span>
        <span className="text-muted"> common </span>
        <span className="text-muted">({fmtCompact(commonPerHour)}/hr)</span>
      </span>
      <span className="mx-2 text-muted" aria-hidden>
        ·
      </span>
      <span className="tabular-nums">
        <span className="font-semibold text-status-info">{rareTotal.toLocaleString()}</span>
        <span className="text-muted"> stage boss </span>
        <span className="text-muted">({fmtCompact(rarePerHour)}/hr)</span>
      </span>
    </p>
  );
}

function ChestCategoryList({
  title,
  rows,
  countClassName,
}: {
  title: string;
  rows: ChestDropBreakdownRow[];
  countClassName?: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-panel/40 p-2">
      <h3 className="m-0 mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="m-0 flex-1 text-[13px] text-muted">None yet</p>
      ) : (
        <DataList scrollable className="max-h-[140px]">
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
        </DataList>
      )}
    </div>
  );
}

function ChestDropHistory({ history }: { history: ChestDropStats["history"] }) {
  return (
    <div className="flex h-full min-h-[200px] flex-col rounded-lg border border-border bg-panel/40 p-2">
      <h3 className="m-0 mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        Chest history
      </h3>
      {history.length === 0 ? (
        <p className="m-0 flex-1 text-[13px] text-muted">No drops logged yet this session.</p>
      ) : (
        <DataList scrollable className="min-h-0 flex-1 max-h-[300px]">
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
        </DataList>
      )}
    </div>
  );
}

export function ChestDropPanel({ chestDrops }: { chestDrops: ChestDropStats }) {
  const { breakdown, history, playerLogAvailable } = chestDrops;
  const common = breakdown.filter((row) => row.category === "common");
  const rare = breakdown.filter((row) => row.category === "rare");

  return (
    <PanelSection title="Chest drops">
      {!playerLogAvailable ? (
        <HintBanner className={cn("mb-2.5 border-l-muted text-muted")}>
          Player.log not found beside your save. Launch the game with the companion open to track
          drops.
        </HintBanner>
      ) : null}

      <ChestDropSummary chestDrops={chestDrops} />

      <LiveSideBySide
        left={
          <div className="flex flex-col gap-2.5">
            <ChestCategoryList title="Common Chests" rows={common} />
            <ChestCategoryList
              title="Stage Boss Chests"
              rows={rare}
              countClassName="text-status-info"
            />
          </div>
        }
        right={<ChestDropHistory history={history} />}
      />
    </PanelSection>
  );
}
