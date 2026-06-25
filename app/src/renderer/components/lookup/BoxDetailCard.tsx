import { useMemo, useState } from "react";
import { boxStageListLabel } from "../../../core/lookup/boxDisplay";
import { fmtDropPct } from "../../lib/lookupDisplay";
import { filterAndSortBoxStages, filterFirstDropStages } from "../../lib/boxLootFilters";
import { Card } from "../../design-system/primitives/Card/Card";
import { DataList, DataListRow } from "../../design-system/primitives/DataList/DataList";
import { Input } from "../../design-system/primitives/Input/Input";
import { SectionHeadingRow } from "./itemCardParts";
import { BoxCardDropSummary, BoxCardHeader } from "./BoxCardParts";
import { ItemLink } from "./ItemLink";
import { BoxLoot } from "./BoxLoot";
import type { LookupBoxSources, LookupItem } from "../../../../shared/types";
import type { LookupNavNode } from "../../lib/useLookupNav";

const WHERE_HELP =
  "Stages where this chest can drop on repeat farming. Drop sources above show kill type and spawn % range. % on each row is per qualifying kill and can differ by stage.";

const FIRST_CLEAR_HELP =
  "One-time reward the first time you clear that stage. This chest cannot be farmed from monster or boss kills.";

const WHERE_LABEL = "Where to find";
const FIRST_CLEAR_LABEL = "First clear";

const NO_LOCATION_COPY = "No known drop locations in the catalog yet.";

export function BoxDetailCard({
  box,
  boxItemKey,
  onNavigate,
  peekItem,
}: {
  box: LookupBoxSources;
  boxItemKey: number;
  onNavigate: (node: LookupNavNode) => void;
  peekItem: (id: number) => LookupItem | undefined;
}) {
  const [farmQuery, setFarmQuery] = useState("");
  const [firstQuery, setFirstQuery] = useState("");

  const filteredFarmStages = useMemo(
    () =>
      filterAndSortBoxStages(box.stages, {
        query: farmQuery,
        sortKey: "spawnPct",
        sortDir: "desc",
      }),
    [box.stages, farmQuery],
  );

  const filteredFirstStages = useMemo(
    () => filterFirstDropStages(box.firstDropStages, firstQuery),
    [box.firstDropStages, firstQuery],
  );

  const showFirstClear = box.firstDropOnly && box.firstDropStages.length > 0;
  const showFarm = !box.firstDropOnly && box.stages.length > 0;
  const showLocationEmpty = !showFirstClear && !showFarm;

  return (
    <Card className="flex flex-col gap-3">
      <BoxCardHeader box={box} boxItemKey={boxItemKey} iconSize="lg" />
      <BoxCardDropSummary box={box} />

      {showFirstClear ? (
        <div className="flex flex-col gap-2">
          <SectionHeadingRow
            label={FIRST_CLEAR_LABEL}
            help={FIRST_CLEAR_HELP}
            helpLabel="How first-clear chests work"
          />

          <div className="flex items-center gap-3">
            <Input
              className="min-w-0 flex-1"
              placeholder="Search stages..."
              value={firstQuery}
              onChange={(e) => setFirstQuery(e.target.value)}
            />
            <span className="shrink-0 whitespace-nowrap text-xs text-muted">
              {filteredFirstStages.length} stages
            </span>
          </div>

          <Card padding="none" className="overflow-hidden">
            <DataList scrollable className="max-h-44">
              {filteredFirstStages.length === 0 ? (
                <DataListRow index={0} className="text-xs text-muted">
                  No stages match your search.
                </DataListRow>
              ) : (
                filteredFirstStages.map((stage, i) => (
                  <DataListRow key={stage.stageKey} index={i}>
                    <ItemLink
                      node={{ type: "stage", id: stage.stageKey }}
                      name={boxStageListLabel(stage.stageKey, stage.stageName)}
                      onNavigate={onNavigate}
                    />
                  </DataListRow>
                ))
              )}
            </DataList>
          </Card>
        </div>
      ) : null}

      {showFarm ? (
        <div className="flex flex-col gap-2">
          <SectionHeadingRow
            label={WHERE_LABEL}
            help={WHERE_HELP}
            helpLabel="How chest drops work"
          />

          <div className="flex items-center gap-3">
            <Input
              className="min-w-0 flex-1"
              placeholder="Search stages..."
              value={farmQuery}
              onChange={(e) => setFarmQuery(e.target.value)}
            />
            <span className="shrink-0 whitespace-nowrap text-xs text-muted">
              {filteredFarmStages.length} stages
            </span>
          </div>

          <Card padding="none" className="overflow-hidden">
            <DataList scrollable className="max-h-44">
              {filteredFarmStages.length === 0 ? (
                <DataListRow index={0} className="text-xs text-muted">
                  No stages match your search.
                </DataListRow>
              ) : (
                filteredFarmStages.map((stage, i) => (
                  <DataListRow key={stage.stageKey} index={i}>
                    <ItemLink
                      node={{ type: "stage", id: stage.stageKey }}
                      name={boxStageListLabel(stage.stageKey, stage.stageName)}
                      suffix={`· ${fmtDropPct(stage.spawnPct)}%`}
                      onNavigate={onNavigate}
                    />
                  </DataListRow>
                ))
              )}
            </DataList>
          </Card>
        </div>
      ) : null}

      {showLocationEmpty ? <p className="m-0 text-xs text-muted">{NO_LOCATION_COPY}</p> : null}

      {box.drops.length > 0 ? (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <BoxLoot drops={box.drops} onNavigate={onNavigate} peekItem={peekItem} />
        </div>
      ) : null}
    </Card>
  );
}
