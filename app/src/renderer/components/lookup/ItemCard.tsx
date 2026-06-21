import { gradeLabel, typeLabel } from "../../../core/labels";
import { gradeColor } from "../../lib/gradeColor";
import { iconSrc } from "../../lib/iconSrc";
import { itemDescriptor, itemMetaLine, visibleOutcomes } from "../../lib/lookupDisplay";
import { Card } from "../../design-system/primitives/Card/Card";
import { ItemIcon } from "../../design-system/primitives/ItemIcon/ItemIcon";
import { TierTag } from "./TierTag";
import type { LookupItem } from "../../../../shared/types";

export function ItemCard({
  item,
  onSelect,
}: {
  item: LookupItem;
  onSelect?: (item: LookupItem) => void;
}) {
  const metaLine = itemMetaLine(item);

  return (
    <Card
      as="li"
      padding="compact"
      className="flex h-full cursor-pointer flex-col gap-1.5 hover:border-ideal/40"
      onClick={() => onSelect?.(item)}
    >
      <div className="flex items-center gap-2">
        <ItemIcon src={iconSrc(item.iconPath)} color={gradeColor(item.grade)} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-[13px] font-medium text-fg">{item.name}</p>
          <p className="m-0 truncate text-[11px]" style={{ color: gradeColor(item.grade) }}>
            {gradeLabel(item.grade)} · {itemDescriptor(item)}
          </p>
          {metaLine ? <p className="m-0 truncate text-[11px] text-muted">{metaLine}</p> : null}
        </div>
      </div>

      {item.stats ? (
        <ul className="m-0 list-none space-y-0.5 p-0 text-[11px]">
          {item.stats.base.map((row, i) => (
            <li key={`base-${i}`} className="text-muted">
              {row.display}
            </li>
          ))}
          {item.stats.inherent.map((row, i) => (
            <li key={`inherent-${i}`} className="text-ideal">
              {row.display}
            </li>
          ))}
          {item.stats.unique ? <li className="text-gold">{item.stats.unique.text}</li> : null}
        </ul>
      ) : null}

      {item.gearGroups?.length ? (
        <div className="flex flex-col gap-1">
          {item.gearGroups
            .filter((group) => group.outcomes.length > 0)
            .map((group) => {
              const { shown, hiddenCount } = visibleOutcomes(item.materialType, group.outcomes);
              return (
                <div key={group.gearGroup}>
                  <p className="m-0 text-[10px] font-medium uppercase tracking-wide text-muted">
                    {typeLabel(group.gearGroup)}
                  </p>
                  <ul className="m-0 list-none space-y-0.5 p-0 text-[11px] text-muted">
                    {shown.map((outcome, i) => (
                      <li key={i} className="flex items-center gap-1">
                        <TierTag tier={outcome.tier} />
                        {outcome.displayText}
                      </li>
                    ))}
                    {hiddenCount > 0 ? (
                      <li className="text-muted/70">+{hiddenCount} more</li>
                    ) : null}
                  </ul>
                </div>
              );
            })}
        </div>
      ) : null}
    </Card>
  );
}
