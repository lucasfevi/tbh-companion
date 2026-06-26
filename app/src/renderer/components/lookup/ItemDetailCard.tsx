import { useMemo, useState } from "react";
import { gradeLabel } from "../../../core/labels";
import {
  formatMaterialAverageLevelRange,
  formatSynthesisResultRange,
  materialAverageLevelRange,
  pathsToItem,
  recipeTierResultRange,
  synthesisPathKey,
  synthesisTypeForItem,
} from "../../../core/lookup/synthesis";
import { boxIconPath } from "../../lib/boxIconPath";
import { fmtDropPct, fmtLookupPct, hasDropChance, humanizeStatKey } from "../../lib/lookupDisplay";
import { filterUsedInOutputs, sortUsedInRecipes } from "../../lib/usedInFilters";
import { gradeColor } from "../../lib/gradeColor";
import { cn } from "../../lib/cn";
import { offeringForCoin, offeringSourcesForItem } from "../../../core/lookup/offerings";
import { Card } from "../../design-system/primitives/Card/Card";
import { CardContent, CardHeader } from "../../design-system/primitives/Card/CardParts";
import { Accordion } from "../../design-system/primitives/Accordion/Accordion";
import { DataList, DataListRow } from "../../design-system/primitives/DataList/DataList";
import { Input } from "../../design-system/primitives/Input/Input";
import {
  ItemCardHeader,
  MaterialGroup,
  SectionHeading,
  SectionHeadingRow,
  SectionLabelRow,
  StatGroup,
} from "./itemCardParts";
import { ItemLink } from "../ItemLink";
import { OfferingLoot } from "./OfferingLoot";
import type {
  LookupBoxSources,
  LookupItem,
  LookupItemSources,
  LookupUsedInEntry,
  OfferingsModel,
  SynthesisModel,
  SynthesisPathToItem,
} from "../../../../shared/types";
import type { LookupNavNode } from "../../lib/useLookupNav";

const SCROLL_SECTION_MAX = "max-h-44";

const CRAFTING_HELP =
  "Craft this item using the materials under each recipe. Each line is a tier, level band, and slot type; the % is your chance to get this item from that craft.";

const DROP_HELP =
  "Boss chests that can contain this item. The % is how often it appears in that box's loot table.";

const SYNTHESIS_HELP =
  "Combine 9 items at the Cube. Each row is a recipe tier and result level band; the % is your chance to roll this item. Item average level affects which recipes apply. The green left edge marks the best odds among all paths.";

const OFFERING_SOURCE_HELP =
  "Toss one of the coins below into the Cube for a chance at this item, among everything else in its loot table. The % is your chance of landing this specific item from that coin.";

const USED_IN_HELP =
  "Crafting recipes that consume this material. Each block shows the recipe tier and level band, all ingredients, and the possible output items from that recipe's loot pool.";

function SynthesisPathRow({
  path,
  synthesisType,
  model,
  isBest,
  index,
}: {
  path: SynthesisPathToItem;
  synthesisType: string;
  model: SynthesisModel;
  isBest: boolean;
  index: number;
}) {
  const tierRange = recipeTierResultRange(model, synthesisType, path.tier);
  const avgRange = materialAverageLevelRange(path);
  const setup =
    tierRange != null
      ? `Tier ${path.tier} (${formatSynthesisResultRange(tierRange.min, tierRange.max)})`
      : `Tier ${path.tier}`;

  return (
    <DataListRow
      index={index}
      className={cn(
        "flex items-baseline justify-between gap-2 py-1.5",
        isBest && "border-l-2 border-l-status-success",
      )}
    >
      <span className="min-w-0 flex-1 text-[13px] leading-snug text-fg">
        {setup}
        <span className="text-[11px] text-muted">
          {" "}
          · {formatMaterialAverageLevelRange(avgRange)}
        </span>
      </span>
      <span
        className={cn(
          "shrink-0 text-[13px] tabular-nums",
          isBest ? "text-status-success" : "text-fg",
        )}
      >
        {fmtLookupPct(path.chance)}%
      </span>
    </DataListRow>
  );
}

function SynthesisGradeCard({
  materialAmount,
  inputGrade,
  paths,
  synthesisType,
  model,
  bestPathKey,
}: {
  materialAmount: number;
  inputGrade: string;
  paths: SynthesisPathToItem[];
  synthesisType: string;
  model: SynthesisModel;
  bestPathKey: string | null;
}) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="border-b border-border px-3 py-2">
        <p className="m-0 text-[12px] font-semibold" style={{ color: gradeColor(inputGrade) }}>
          {materialAmount}× {gradeLabel(inputGrade)}
        </p>
      </div>
      <DataList shell="none" scrollable className={SCROLL_SECTION_MAX}>
        {paths.map((path, i) => (
          <SynthesisPathRow
            key={synthesisPathKey(path)}
            path={path}
            synthesisType={synthesisType}
            model={model}
            isBest={synthesisPathKey(path) === bestPathKey}
            index={i}
          />
        ))}
      </DataList>
    </Card>
  );
}

function groupPathsByInput(paths: SynthesisPathToItem[]) {
  const groups = new Map<string, SynthesisPathToItem[]>();
  for (const path of paths) {
    const key = `${path.inputGrade}|${path.gradeStep}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(path);
  }
  return [...groups.entries()]
    .map(([key, groupPaths]) => {
      const [inputGrade, gradeStepStr] = key.split("|");
      const paths = groupPaths.toSorted((a, b) => b.chance - a.chance);
      return {
        inputGrade,
        gradeStep: Number(gradeStepStr),
        materialAmount: groupPaths[0]?.materialAmount ?? 9,
        paths,
        bestChance: paths[0]?.chance ?? 0,
      };
    })
    .toSorted((a, b) => b.bestChance - a.bestChance);
}

function UsedInRecipeCard({
  entry,
  peekItem,
  onNavigate,
  outputItemIndex,
}: {
  entry: LookupUsedInEntry;
  peekItem?: (id: number) => LookupItem | undefined;
  onNavigate?: (node: LookupNavNode) => void;
  outputItemIndex: Map<number, LookupItem>;
}) {
  const [query, setQuery] = useState("");
  const filteredOutputs = useMemo(
    () => filterUsedInOutputs(entry.outputs, query, outputItemIndex),
    [entry.outputs, query, outputItemIndex],
  );
  const showPoolPct = entry.outputs.length > 1;

  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-[13px] text-fg">
        T{entry.tier} (Lv {entry.level.min}–{entry.level.max}) ·{" "}
        {humanizeStatKey(entry.craftingType)}
      </p>
      <div className="flex flex-col gap-1 pl-1">
        {entry.materials.map((material) => {
          const matItem = peekItem?.(material.itemKey);
          return (
            <ItemLink
              key={material.itemKey}
              node={{ type: "item", id: material.itemKey }}
              name={matItem?.name ?? material.name}
              grade={matItem?.grade}
              iconPath={matItem?.iconPath}
              suffix={material.amount > 1 ? `×${material.amount}` : undefined}
              onNavigate={onNavigate}
              peekItem={peekItem}
            />
          );
        })}
      </div>
      <Accordion title={`${entry.outputs.length} items`}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Input
              className="min-w-0 flex-1"
              placeholder="Search items..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <span className="shrink-0 whitespace-nowrap text-xs text-muted">
              {filteredOutputs.length} items
            </span>
          </div>
          <Card padding="none" className="overflow-hidden">
            <DataList scrollable className={SCROLL_SECTION_MAX}>
              {filteredOutputs.length === 0 ? (
                <DataListRow index={0} className="text-xs text-muted">
                  No items match your search.
                </DataListRow>
              ) : (
                filteredOutputs.map((output, i) => {
                  const outItem = peekItem?.(output.itemKey);
                  const pctSuffix = showPoolPct ? ` · ${fmtLookupPct(output.poolPct)}%` : undefined;
                  return (
                    <DataListRow key={output.itemKey} index={i}>
                      <ItemLink
                        node={{ type: "item", id: output.itemKey }}
                        name={outItem?.name ?? `Item ${output.itemKey}`}
                        grade={outItem?.grade}
                        iconPath={outItem?.iconPath}
                        suffix={pctSuffix}
                        onNavigate={onNavigate}
                        peekItem={peekItem}
                      />
                    </DataListRow>
                  );
                })
              )}
            </DataList>
          </Card>
        </div>
      </Accordion>
    </div>
  );
}

/**
 * Reusable item detail surface — drives the Lookup tab's detail panel and
 * (later) Inventory row hover. Links are inert unless onNavigate is passed.
 */
export function ItemDetailCard({
  item,
  sources,
  synthesisModel,
  offerings,
  onNavigate,
  peekItem,
  peekBox,
}: {
  item: LookupItem;
  sources?: LookupItemSources;
  synthesisModel?: SynthesisModel | null;
  offerings?: OfferingsModel | null;
  onNavigate?: (node: LookupNavNode) => void;
  peekItem?: (id: number) => LookupItem | undefined;
  peekBox?: (id: number) => LookupBoxSources | undefined;
}) {
  const synthesisPaths = useMemo(
    () => (synthesisModel ? pathsToItem(item, synthesisModel) : []),
    [item, synthesisModel],
  );

  const offering =
    item.materialType === "OFFERING" && offerings ? offeringForCoin(offerings, item.id) : null;
  const offeringSources = useMemo(
    () => (offerings ? offeringSourcesForItem(offerings, item.id) : []),
    [offerings, item.id],
  );

  const hasCrafting = (sources?.crafting.length ?? 0) > 0;
  const hasSynthesis = synthesisPaths.length > 0 && synthesisModel != null;
  const sortedDrops = sources
    ? [...sources.drops].filter(hasDropChance).sort((a, b) => (b.dropPct ?? -1) - (a.dropPct ?? -1))
    : [];
  const hasDrops = sortedDrops.length > 0;
  const hasOfferingSources = offeringSources.length > 0;
  const hasAcquisition = hasCrafting || hasSynthesis || hasDrops || hasOfferingSources;
  const hasUsedIn = item.type === "MATERIAL" && (sources?.usedIn?.length ?? 0) > 0;

  const usedInRecipes = useMemo(() => sortUsedInRecipes(sources?.usedIn ?? []), [sources?.usedIn]);

  const outputItemIndex = useMemo(() => {
    const map = new Map<number, LookupItem>();
    if (!sources?.usedIn || !peekItem) return map;
    for (const entry of sources.usedIn) {
      for (const output of entry.outputs) {
        const resolved = peekItem(output.itemKey);
        if (resolved) map.set(output.itemKey, resolved);
      }
    }
    return map;
  }, [sources, peekItem]);

  const pathGroups = groupPathsByInput(synthesisPaths);
  const synthesisType = synthesisTypeForItem(item);
  const bestPathKey = synthesisPaths[0] != null ? synthesisPathKey(synthesisPaths[0]) : null;

  const hasStats =
    (item.stats != null &&
      (item.stats.base.length > 0 ||
        item.stats.inherent.length > 0 ||
        item.stats.unique != null)) ||
    (item.gearGroups?.length ?? 0) > 0;

  return (
    <Card className="flex flex-col gap-3">
      <CardHeader>
        <ItemCardHeader item={item} iconSize="lg" />
      </CardHeader>

      <CardContent className="gap-3">
        {hasStats ? (
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
          </div>
        ) : null}

        <div className={cn("flex flex-col gap-3", hasStats && "border-t border-border pt-3")}>
          <SectionHeading>Where to find</SectionHeading>

          {!hasAcquisition ? (
            <p className="m-0 text-xs text-muted">
              Not obtained through drops, crafting, synthesis, or offerings.
            </p>
          ) : (
            <div className="flex min-w-0 flex-col gap-3">
              {hasCrafting && sources ? (
                <div className="flex flex-col gap-2">
                  <SectionLabelRow
                    label="Crafting"
                    help={CRAFTING_HELP}
                    helpLabel="How crafting works"
                  />
                  <Card padding="none" className="overflow-hidden">
                    <div className="flex flex-col gap-3 p-3">
                      {sources.crafting.map((recipe) => (
                        <div key={recipe.recipeKey} className="flex flex-col gap-1">
                          <p className="m-0 text-[13px] text-fg">
                            T{recipe.tier} (Lv {recipe.level.min}–{recipe.level.max}) ·{" "}
                            {humanizeStatKey(recipe.craftingType)} ·{" "}
                            {fmtLookupPct(recipe.outputPct)}%
                          </p>
                          <div className="flex flex-col gap-1 pl-1">
                            {recipe.materials.map((material) => {
                              const matItem = peekItem?.(material.itemKey);
                              return (
                                <ItemLink
                                  key={material.itemKey}
                                  node={{ type: "item", id: material.itemKey }}
                                  name={matItem?.name ?? material.name}
                                  grade={matItem?.grade}
                                  iconPath={matItem?.iconPath}
                                  suffix={material.amount > 1 ? `×${material.amount}` : undefined}
                                  onNavigate={onNavigate}
                                  peekItem={peekItem}
                                />
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              ) : null}

              {hasDrops ? (
                <div className="flex flex-col gap-2">
                  <SectionLabelRow label="Drop" help={DROP_HELP} helpLabel="How drops work" />
                  <Card padding="none" className="overflow-hidden">
                    <DataList scrollable className={SCROLL_SECTION_MAX}>
                      {sortedDrops.map((drop, i) => (
                        <DataListRow key={drop.boxItemKey} index={i}>
                          <ItemLink
                            node={{ type: "box", id: drop.boxItemKey }}
                            name={drop.boxName}
                            grade={drop.grade}
                            iconPath={boxIconPath(drop.boxItemKey)}
                            suffix={`· ${fmtDropPct(drop.dropPct)}%`}
                            onNavigate={onNavigate}
                            peekBox={peekBox}
                          />
                        </DataListRow>
                      ))}
                    </DataList>
                  </Card>
                </div>
              ) : null}

              {hasSynthesis && synthesisModel && synthesisType ? (
                <div className="flex flex-col gap-2">
                  <SectionLabelRow
                    label="Synthesis"
                    help={SYNTHESIS_HELP}
                    helpLabel="How synthesis works"
                  />
                  <div className="flex flex-col gap-2">
                    {pathGroups.map((group) => (
                      <SynthesisGradeCard
                        key={`${group.inputGrade}-${group.gradeStep}`}
                        materialAmount={group.materialAmount}
                        inputGrade={group.inputGrade}
                        paths={group.paths}
                        synthesisType={synthesisType}
                        model={synthesisModel}
                        bestPathKey={bestPathKey}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              {hasOfferingSources ? (
                <div className="flex flex-col gap-2">
                  <SectionLabelRow
                    label="Offering"
                    help={OFFERING_SOURCE_HELP}
                    helpLabel="How offerings work"
                  />
                  <Card padding="none" className="overflow-hidden">
                    <DataList scrollable className={SCROLL_SECTION_MAX}>
                      {offeringSources.map((source, i) => {
                        const coinItem = peekItem?.(source.coinKey);
                        return (
                          <DataListRow key={source.coinKey} index={i}>
                            <ItemLink
                              node={{ type: "item", id: source.coinKey }}
                              name={coinItem?.name ?? `Coin ${source.coinKey}`}
                              grade={coinItem?.grade}
                              iconPath={coinItem?.iconPath}
                              suffix={`· ${fmtDropPct(source.poolPct)}%`}
                              onNavigate={onNavigate}
                              peekItem={peekItem}
                            />
                          </DataListRow>
                        );
                      })}
                    </DataList>
                  </Card>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {hasUsedIn ? (
          <div className="flex flex-col gap-3 border-t border-border pt-3">
            <SectionHeadingRow
              label="Used in crafting"
              help={USED_IN_HELP}
              helpLabel="How material crafting works"
            />
            <div className="flex flex-col gap-3">
              {usedInRecipes.map((entry) => (
                <UsedInRecipeCard
                  key={entry.recipeKey}
                  entry={entry}
                  peekItem={peekItem}
                  onNavigate={onNavigate}
                  outputItemIndex={outputItemIndex}
                />
              ))}
            </div>
          </div>
        ) : null}

        {offering ? (
          <div className="flex flex-col gap-3 border-t border-border pt-3">
            <OfferingLoot
              offering={offering}
              onNavigate={onNavigate}
              peekItem={peekItem ?? (() => undefined)}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
