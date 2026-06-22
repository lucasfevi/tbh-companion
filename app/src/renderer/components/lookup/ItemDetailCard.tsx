import { gradeLabel } from "../../../core/labels";
import { humanizeStatKey } from "../../lib/lookupDisplay";
import { gradeColor } from "../../lib/gradeColor";
import { Card } from "../../design-system/primitives/Card/Card";
import { CardContent, CardHeader } from "../../design-system/primitives/Card/CardParts";
import { Accordion } from "../../design-system/primitives/Accordion/Accordion";
import { ItemCardHeader, MaterialGroup, StatGroup } from "./itemCardParts";
import { ItemLink } from "./ItemLink";
import type { LookupItem, LookupItemSources } from "../../../../shared/types";
import type { LookupNavNode } from "../../lib/useLookupNav";

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-fg/70">{children}</p>
  );
}

/**
 * Reusable item detail surface — drives the Lookup tab's detail panel and
 * (later) Inventory row hover. Links are inert unless onNavigate is passed.
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

  const sortedDrops = sources
    ? [...sources.drops].sort((a, b) => (b.dropPct ?? -1) - (a.dropPct ?? -1))
    : [];

  return (
    <Card className="flex flex-col gap-3">
      <CardHeader>
        <ItemCardHeader item={item} iconSize="lg" />
      </CardHeader>

      <CardContent className="gap-4 md:grid md:grid-cols-[1fr_minmax(0,15rem)] md:items-start">
        <div className="flex min-w-0 flex-col gap-3">
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

          {!hasSourceData ? (
            <p className="m-0 text-xs text-muted">
              Not obtained through drops, crafting, or synthesis.
            </p>
          ) : null}

          {sources && sources.crafting.length > 0 ? (
            <div className="flex flex-col gap-2">
              <SectionLabel>Crafting</SectionLabel>
              {sources.crafting.map((recipe) => (
                <div key={recipe.recipeKey} className="flex flex-col gap-1">
                  <p className="m-0 text-[13px] text-fg">
                    T{recipe.tier} (Lv {recipe.level.min}–{recipe.level.max}) ·{" "}
                    {humanizeStatKey(recipe.craftingType)} — {recipe.outputPct}%
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 pl-3">
                    {recipe.materials.map((material) => {
                      const matItem = peekItem?.(material.itemKey);
                      return (
                        <ItemLink
                          key={material.itemKey}
                          node={{ type: "item", id: material.itemKey }}
                          name={matItem?.name ?? material.name}
                          grade={matItem?.grade}
                          iconPath={matItem?.iconPath}
                          suffix={`×${material.amount}`}
                          onNavigate={onNavigate}
                          peekItem={peekItem}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {sources && sources.synthesis.length > 0 ? (
            <div className="flex flex-col gap-2">
              <SectionLabel>Synthesis</SectionLabel>
              {sources.synthesis.map((group) => (
                <div
                  key={`${group.inputGrade}-${group.gradeStep}`}
                  className="flex flex-col gap-0.5"
                >
                  <p
                    className="m-0 text-[13px] font-medium"
                    style={{ color: gradeColor(group.inputGrade) }}
                  >
                    {gradeLabel(group.inputGrade)} ×{group.paths[0]?.materialAmount ?? 9}
                    {group.gradeStep === 2 ? (
                      <span className="ml-1 font-normal text-muted">(skip +2)</span>
                    ) : null}
                  </p>
                  <ul className="m-0 list-none space-y-0.5 p-0 pl-3 text-[12px] text-muted">
                    {group.paths.map((path, i) => (
                      <li key={i}>
                        avg Lv {path.materialAvgLevel}+ — {path.chance}%
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {sources.synthesisPool.length > 0 ? (
                <Accordion
                  title={`${sources.synthesisPool.length} possible results`}
                  variant="card"
                >
                  <div className="flex flex-col gap-1">
                    {sources.synthesisPool.map((pool) => {
                      const poolItem = peekItem?.(pool.itemKey);
                      return (
                        <ItemLink
                          key={pool.itemKey}
                          node={{ type: "item", id: pool.itemKey }}
                          name={poolItem?.name ?? `Item ${pool.itemKey}`}
                          grade={poolItem?.grade}
                          iconPath={poolItem?.iconPath}
                          suffix={`· ${pool.poolPct}%`}
                          onNavigate={onNavigate}
                          peekItem={peekItem}
                        />
                      );
                    })}
                  </div>
                </Accordion>
              ) : null}
            </div>
          ) : null}
        </div>

        {sortedDrops.length > 0 ? (
          <div className="flex max-h-80 min-w-0 flex-col gap-1.5 overflow-y-auto md:border-l md:border-border md:pl-4">
            <SectionLabel>Where to find</SectionLabel>
            {sortedDrops.map((drop) => (
              <ItemLink
                key={drop.boxItemKey}
                node={{ type: "box", id: drop.boxItemKey }}
                name={drop.boxName}
                grade={drop.grade}
                iconPath={`Item_${drop.boxItemKey}`}
                suffix={drop.dropPct != null ? `· ${drop.dropPct}%` : undefined}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
