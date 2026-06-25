import { gradeLabel } from "../../../core/labels";
import {
  boxCategoryLabel,
  boxDropViaSummaries,
  FIRST_DROP_ONLY_LABEL,
  splitDropStageRangeLines,
} from "../../../core/lookup/boxDisplay";
import { boxIconPath } from "../../lib/boxIconPath";
import { fmtDropPct } from "../../lib/lookupDisplay";
import { gradeColor } from "../../lib/gradeColor";
import { iconSrc } from "../../lib/iconSrc";
import { cn } from "../../lib/cn";
import { ItemIcon } from "../../design-system/primitives/ItemIcon/ItemIcon";
import { StatGroup } from "./itemCardParts";
import type { LookupBoxDropVia, LookupBoxSources } from "../../../../shared/types";

function boxDropViaTone(via: LookupBoxDropVia): string {
  switch (via) {
    case "monster_box":
      return "text-muted";
    case "boss_box":
      return "text-ideal";
    case "act_boss":
      return "text-danger";
  }
}

function formatSpawnPctRange(minPct: number, maxPct: number): string {
  if (minPct === maxPct) return `${fmtDropPct(minPct)}%`;
  return `${fmtDropPct(minPct)}–${fmtDropPct(maxPct)}%`;
}

/** Icon + title block shared by box peek and detail panel headers. */
export function BoxCardHeader({
  box,
  boxItemKey,
  iconSize,
}: {
  box: LookupBoxSources;
  boxItemKey: number;
  iconSize: "md" | "lg";
}) {
  const color = box.grade ? gradeColor(box.grade) : undefined;
  const isDetail = iconSize === "lg";

  return (
    <div className="flex items-start gap-2">
      <ItemIcon
        src={iconSrc(boxIconPath(boxItemKey))}
        color={color ?? gradeColor("COMMON")}
        size={iconSize}
      />
      <div className="min-w-0 flex-1">
        {isDetail ? (
          <h2 className="m-0 truncate text-base font-semibold text-fg">{box.name}</h2>
        ) : (
          <p className="m-0 truncate text-[13px] font-medium text-fg">{box.name}</p>
        )}
        <p
          className={cn("m-0 truncate", isDetail ? "text-xs" : "text-[11px]")}
          style={color ? { color } : undefined}
        >
          {box.grade ? `${gradeLabel(box.grade)} · ` : ""}
          {boxCategoryLabel(box.category)}
        </p>
        {box.firstDropOnly ? (
          <p className={cn("m-0 truncate text-gold", isDetail ? "text-xs" : "text-[11px]")}>
            {FIRST_DROP_ONLY_LABEL}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Stage ranges + drop sources — identical in peek and detail headers. */
export function BoxCardDropSummary({ box }: { box: LookupBoxSources }) {
  const rangeLines = splitDropStageRangeLines(box.dropStageRangeLabel);
  const viaSummaries = box.firstDropOnly ? [] : boxDropViaSummaries(box.stages);

  const rangeRows = rangeLines.map((line) => ({ display: line }));
  const viaRows = viaSummaries.map((row) => ({
    display: `${row.label} · ${formatSpawnPctRange(row.minPct, row.maxPct)}`,
    via: row.via,
  }));

  if (rangeRows.length === 0 && viaRows.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {rangeRows.length > 0 ? (
        <StatGroup title="Stage ranges" rows={rangeRows} tone="base" />
      ) : null}
      {viaRows.length > 0 ? (
        <div
          className={cn(
            "flex flex-col gap-1.5",
            rangeRows.length > 0 ? "mt-1 border-t border-border/50 pt-2.5" : null,
          )}
        >
          <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-fg/60">
            Drop sources
          </p>
          <ul className="m-0 list-none divide-y divide-border/50 overflow-hidden rounded-md bg-panel/50 text-[13px]">
            {viaRows.map((row) => (
              <li
                key={row.via}
                className={cn("px-2.5 py-1.5 leading-snug", boxDropViaTone(row.via))}
              >
                {row.display}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
