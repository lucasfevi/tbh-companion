import { gradeLabel } from "../../../core/labels";
import { Card } from "../../design-system/primitives/Card/Card";
import { CardContent, CardHeader } from "../../design-system/primitives/Card/CardParts";
import { ItemCardHeader, MaterialGroup, StatGroup } from "./itemCardParts";
import { NavChip } from "./NavChip";
import type { LookupItem, LookupItemSources } from "../../../../shared/types";
import type { LookupNavNode } from "../../lib/useLookupNav";

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
      <CardHeader>
        <ItemCardHeader item={item} iconSize="lg" />
      </CardHeader>

      <CardContent>
        {item.stats ? (
          <>
            <StatGroup title="Base stats" rows={item.stats.base} tone="base" />
            <StatGroup title="Inherent stats" rows={item.stats.inherent} tone="inherent" />
            {item.stats.unique ? (
              <StatGroup
                title="Unique effect"
                rows={[{ display: item.stats.unique.text }]}
                tone="unique"
              />
            ) : null}
          </>
        ) : null}

        {item.gearGroups?.map((group) => (
          <MaterialGroup key={group.gearGroup} group={group} />
        ))}

        {sources ? (
          <div className="flex flex-col gap-2 border-t border-border pt-2">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-muted">
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
      </CardContent>

      {/* Footer: Steam Market price (future) */}
    </Card>
  );
}
