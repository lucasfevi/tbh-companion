import { gradeLabel, typeLabel } from "../../../core/labels";
import { cn } from "../../lib/cn";
import { gradeColor } from "../../lib/gradeColor";
import { iconSrc } from "../../lib/iconSrc";
import { itemDescriptor, itemMetaLine, visibleOutcomes } from "../../lib/lookupDisplay";
import { ItemIcon } from "../../design-system/primitives/ItemIcon/ItemIcon";
import { TierTag } from "./TierTag";
import type { LookupItem, LookupMaterialGearGroup } from "../../../../shared/types";

/**
 * Icon + name + grade · descriptor + optional meta line, shared by the grid
 * card and detail panel — only the icon size (and the resulting name markup:
 * `<h2>` for the detail panel's page title, `<p>` for the grid card) differs.
 */
export function ItemCardHeader({ item, iconSize }: { item: LookupItem; iconSize: "md" | "lg" }) {
  const metaLine = itemMetaLine(item);
  const isDetail = iconSize === "lg";

  return (
    <>
      <ItemIcon src={iconSrc(item.iconPath)} color={gradeColor(item.grade)} size={iconSize} />
      <div className={isDetail ? "min-w-0" : "min-w-0 flex-1"}>
        {isDetail ? (
          <h2 className="m-0 truncate text-base font-semibold text-fg">{item.name}</h2>
        ) : (
          <p className="m-0 truncate text-[13px] font-medium text-fg">{item.name}</p>
        )}
        <p
          className={cn("m-0 truncate", isDetail ? "text-xs" : "text-[11px]")}
          style={{ color: gradeColor(item.grade) }}
        >
          {gradeLabel(item.grade)} · {itemDescriptor(item)}
        </p>
        {metaLine ? (
          <p className={cn("m-0 truncate text-muted", isDetail ? "text-xs" : "text-[11px]")}>
            {metaLine}
          </p>
        ) : null}
      </div>
    </>
  );
}

/** Bold uppercase heading + rows, used for gear's base/inherent/unique stat groups. */
export function StatGroup({
  title,
  rows,
  tone,
}: {
  title: string;
  rows: Array<{ display: string }>;
  tone: "base" | "inherent" | "unique";
}) {
  if (rows.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</p>
      <ul
        className={cn(
          "m-0 list-none space-y-0.5 p-0 text-[13px]",
          tone === "base"
            ? "text-fg"
            : tone === "inherent"
              ? "text-ideal font-medium"
              : "text-gold",
        )}
      >
        {rows.map((row, i) => (
          <li key={i}>{row.display}</li>
        ))}
      </ul>
    </div>
  );
}

/** Bold uppercase WEAPON/ARMOR/ACCESSORY heading + tiered material-effect rows. */
export function MaterialGroup({
  group,
  materialType,
  compact,
}: {
  group: LookupMaterialGearGroup;
  materialType?: string | null;
  compact?: boolean;
}) {
  if (group.outcomes.length === 0) return null;
  const { shown, hiddenCount } = compact
    ? visibleOutcomes(materialType ?? null, group.outcomes)
    : { shown: group.outcomes, hiddenCount: 0 };

  return (
    <div className="flex flex-col gap-1">
      <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-muted">
        {typeLabel(group.gearGroup)}
      </p>
      <ul className="m-0 list-none space-y-0.5 p-0 text-[13px] text-fg">
        {shown.map((outcome, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <TierTag tier={outcome.tier} />
            {outcome.displayText}
          </li>
        ))}
        {hiddenCount > 0 ? <li className="text-muted/70">+{hiddenCount} more</li> : null}
      </ul>
    </div>
  );
}
