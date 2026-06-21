import { gradeLabel } from "../../../core/labels";
import { gradeColor } from "../../lib/gradeColor";
import { iconSrc } from "../../lib/iconSrc";
import { itemDescriptor, itemMetaLine } from "../../lib/lookupDisplay";
import { ItemIcon } from "../../design-system/primitives/ItemIcon/ItemIcon";
import { TierTag } from "./TierTag";
import type { LookupItem } from "../../../../shared/types";

/** Read-only mini stat card used for hover peeks on source chips (NavChip). */
export function ItemPeekCard({ item }: { item: LookupItem }) {
  const taggedStats = item.stats
    ? [
        ...item.stats.base.map((row) => ({ ...row, tone: "muted" as const })),
        ...item.stats.inherent.map((row) => ({ ...row, tone: "ideal" as const })),
      ].slice(0, 4)
    : [];
  const outcomes = item.gearGroups?.[0]?.outcomes.slice(0, 3) ?? [];
  const metaLine = itemMetaLine(item);

  return (
    <div className="flex w-56 flex-col gap-2">
      <div className="flex items-center gap-2">
        <ItemIcon src={iconSrc(item.iconPath)} color={gradeColor(item.grade)} size="sm" />
        <div className="min-w-0">
          <p className="m-0 truncate text-[13px] font-medium text-fg">{item.name}</p>
          <p className="m-0 text-[11px]" style={{ color: gradeColor(item.grade) }}>
            {gradeLabel(item.grade)} · {itemDescriptor(item)}
          </p>
          {metaLine ? <p className="m-0 text-[11px] text-muted">{metaLine}</p> : null}
        </div>
      </div>
      {taggedStats.length > 0 ? (
        <ul className="m-0 list-none space-y-0.5 p-0 text-[11px]">
          {taggedStats.map((row, i) => (
            <li key={i} className={row.tone === "muted" ? "text-muted" : "text-ideal"}>
              {row.display}
            </li>
          ))}
        </ul>
      ) : null}
      {item.stats?.unique ? (
        <p className="m-0 text-[11px] text-gold">{item.stats.unique.text}</p>
      ) : null}
      {outcomes.length > 0 ? (
        <ul className="m-0 list-none space-y-0.5 p-0 text-[11px] text-muted">
          {outcomes.map((outcome, i) => (
            <li key={i} className="flex items-center gap-1">
              <TierTag tier={outcome.tier} />
              {outcome.displayText}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
