import type { ChestDropStats } from "../../../../shared/types";
import { HintBanner } from "../../design-system/primitives/HintBanner/HintBanner";
import { fmtClock } from "../../lib/format";
import { cn } from "../../lib/cn";
import { LiveHistoryPanel, LiveHistoryRow, TIME_COLUMN_WIDTH } from "./LiveHistoryPanel";

const COLUMNS = [{ label: "Dropped at", width: TIME_COLUMN_WIDTH }, { label: "Chest" }];

/**
 * Chest drop history log. Per-category totals/rates already show as stat
 * cards above (Common chests, Stage boss chests) — this panel is just the
 * chronological drop log, not a duplicate breakdown.
 */
export function ChestDropPanel({
  chestDrops,
  inactiveMessage,
}: {
  chestDrops: ChestDropStats;
  /** When set, chest session tracking is inactive — explain why zeros are not live drops. */
  inactiveMessage?: string | null;
}) {
  const { history } = chestDrops;

  return (
    <>
      {inactiveMessage ? <HintBanner>{inactiveMessage}</HintBanner> : null}
      <LiveHistoryPanel
        title="Chest history"
        columns={COLUMNS}
        empty={
          history.length === 0 ? (
            <p className="m-0">
              {inactiveMessage
                ? "No drops tracked this session."
                : "No drops logged yet this session."}
            </p>
          ) : undefined
        }
      >
        {history.map((entry, i) => (
          <LiveHistoryRow
            key={`${entry.wallTime}-${entry.itemKey}-${i}`}
            index={i}
            cells={[
              {
                content: fmtClock(entry.wallTime),
                className: "tabular-nums text-muted whitespace-nowrap",
              },
              {
                content: entry.name,
                className: cn(
                  "min-w-0 truncate",
                  entry.category === "rare" ? "text-status-info" : "text-fg",
                ),
              },
            ]}
          />
        ))}
      </LiveHistoryPanel>
    </>
  );
}
