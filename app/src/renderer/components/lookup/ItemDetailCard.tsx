import { gradeLabel, typeLabel } from "../../../core/labels";
import { gradeColor } from "../../lib/gradeColor";
import { iconSrc } from "../../lib/iconSrc";
import { itemDescriptor, itemMetaLine } from "../../lib/lookupDisplay";
import { cn } from "../../lib/cn";
import { Card } from "../../design-system/primitives/Card/Card";
import { ItemIcon } from "../../design-system/primitives/ItemIcon/ItemIcon";
import { NavChip } from "./NavChip";
import { TierTag } from "./TierTag";
import type { LookupItem, LookupItemSources, LookupStatRow } from "../../../../shared/types";
import type { LookupNavNode } from "../../lib/useLookupNav";

function StatList({
  title,
  rows,
  tone,
}: {
  title: string;
  rows: LookupStatRow[];
  tone: "muted" | "ideal";
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <p className="m-0 text-[11px] font-medium uppercase tracking-wide text-muted">{title}</p>
      <ul
        className={cn(
          "m-0 list-none space-y-0.5 p-0 text-[13px]",
          tone === "muted" ? "text-muted" : "text-ideal",
        )}
      >
        {rows.map((row, i) => (
          <li key={i}>{row.display}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Reusable item detail surface — drives the Lookup tab's detail panel and
 * (later) Inventory row hover. Chips are inert unless onNavigate is passed.
 */
export function ItemDetailCard({
  item,
  sources,
  onNavigate,
  peekItem,
}: {
  item: LookupItem;
  sources?: LookupItemSources;
  onNavigate?: (node: LookupNavNode) => void;
  peekItem?: (id: number) => LookupItem | undefined;
}) {
  const hasSourceData =
    sources &&
    (sources.drops.length > 0 || sources.crafting.length > 0 || sources.synthesis.length > 0);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <ItemIcon src={iconSrc(item.iconPath)} color={gradeColor(item.grade)} size="lg" />
        <div className="min-w-0">
          <h2 className="m-0 truncate text-base font-semibold text-fg">{item.name}</h2>
          <p className="m-0 text-xs" style={{ color: gradeColor(item.grade) }}>
            {gradeLabel(item.grade)} · {itemDescriptor(item)}
          </p>
          {itemMetaLine(item) ? (
            <p className="m-0 text-xs text-muted">{itemMetaLine(item)}</p>
          ) : null}
        </div>
      </div>

      {item.stats ? (
        <div className="flex flex-col gap-2">
          <StatList title="Base stats" rows={item.stats.base} tone="muted" />
          <StatList title="Inherent stats" rows={item.stats.inherent} tone="ideal" />
          {item.stats.unique ? (
            <div>
              <p className="m-0 text-[11px] font-medium uppercase tracking-wide text-muted">
                Unique effect
              </p>
              <p className="m-0 text-[13px] text-gold">{item.stats.unique.text}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {item.gearGroups?.length ? (
        <div className="flex flex-col gap-2">
          {item.gearGroups.map((group) => (
            <div key={group.gearGroup}>
              <p className="m-0 text-[11px] font-medium uppercase tracking-wide text-muted">
                {typeLabel(group.gearGroup)}
              </p>
              <ul className="m-0 list-none space-y-0.5 p-0 text-[13px] text-fg">
                {group.outcomes.map((outcome, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <TierTag tier={outcome.tier} />
                    {outcome.displayText}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}

      {sources ? (
        <div className="flex flex-col gap-2 border-t border-border pt-2">
          <p className="m-0 text-[11px] font-medium uppercase tracking-wide text-muted">
            Where to find
          </p>
          {!hasSourceData ? (
            <p className="m-0 text-xs text-muted">
              Not obtained through drops, crafting, or synthesis.
            </p>
          ) : null}
          {sources.drops.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {sources.drops.map((drop) => (
                <NavChip
                  key={drop.boxItemKey}
                  node={{ type: "box", id: drop.boxItemKey }}
                  label={`${drop.boxName} (${drop.dropPct}%)`}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          ) : null}
          {sources.crafting.length > 0 ? (
            <div className="flex flex-col gap-1">
              <p className="m-0 text-xs text-muted">Crafting</p>
              {sources.crafting.map((recipe) => (
                <div key={recipe.recipeKey} className="flex flex-wrap items-center gap-1.5">
                  {recipe.materials.map((material) => (
                    <NavChip
                      key={material.itemKey}
                      node={{ type: "item", id: material.itemKey }}
                      label={`${material.name} ×${material.amount}`}
                      onNavigate={onNavigate}
                      peekItem={peekItem}
                    />
                  ))}
                  <span className="text-[11px] text-muted">{recipe.outputPct}% chance</span>
                </div>
              ))}
            </div>
          ) : null}
          {sources.synthesis.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              <p className="m-0 text-xs text-muted">Synthesis</p>
              {sources.synthesis.map((synth) => (
                <p key={synth.recipeKey} className="m-0 text-[11px] text-muted">
                  {gradeLabel(synth.grade)} tier {synth.tier} · Lv {synth.resultLevel.min}–
                  {synth.resultLevel.max}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
