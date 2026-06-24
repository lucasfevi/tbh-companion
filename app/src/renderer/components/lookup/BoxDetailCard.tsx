import { useMemo, useState } from "react";
import { gradeLabel } from "../../../core/labels";
import {
  boxCategoryLabel,
  boxDropViaLabel,
  FIRST_DROP_ONLY_LABEL,
} from "../../../core/lookup/boxDisplay";
import { stageName } from "../../../core/stages";
import { boxIconPath } from "../../lib/boxIconPath";
import { fmtDropPct } from "../../lib/lookupDisplay";
import { filterAndSortBoxStages } from "../../lib/boxLootFilters";
import { gradeColor } from "../../lib/gradeColor";
import { iconSrc } from "../../lib/iconSrc";
import { cn } from "../../lib/cn";
import { Card } from "../../design-system/primitives/Card/Card";
import { DataList, DataListRow } from "../../design-system/primitives/DataList/DataList";
import { Input } from "../../design-system/primitives/Input/Input";
import { ItemIcon } from "../../design-system/primitives/ItemIcon/ItemIcon";
import { SectionHeadingRow } from "./itemCardParts";
import { ItemLink } from "./ItemLink";
import { BoxLoot } from "./BoxLoot";
import type { LookupBoxSources, LookupItem } from "../../../../shared/types";
import type { LookupNavNode } from "../../lib/useLookupNav";

const WHERE_HELP =
  "Stages where this chest can drop on repeat farming. Gray = monster kill, blue = stage boss, red = act boss. % is per qualifying kill and can differ by stage.";

const FIRST_CLEAR_HELP =
  "One-time reward the first time you clear that stage. This chest cannot be farmed from monster or boss kills.";

const WHERE_LABEL = "Where to find";
const FIRST_CLEAR_LABEL = "First clear";

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
  const color = box.grade ? gradeColor(box.grade) : undefined;

  const filteredFarmStages = useMemo(
    () =>
      filterAndSortBoxStages(box.stages, {
        query: farmQuery,
        sortKey: "spawnPct",
        sortDir: "desc",
      }),
    [box.stages, farmQuery],
  );

  const filteredFirstStages = useMemo(() => {
    const q = firstQuery.trim().toLowerCase();
    return box.firstDropStages.filter(
      (s) =>
        !q ||
        s.stageName.toLowerCase().includes(q) ||
        stageName(s.stageKey).toLowerCase().includes(q),
    );
  }, [box.firstDropStages, firstQuery]);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <ItemIcon
          src={iconSrc(boxIconPath(boxItemKey))}
          color={color ?? gradeColor("COMMON")}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <h2 className="m-0 truncate text-base font-semibold text-fg">{box.name}</h2>
          <p className="m-0 truncate text-xs" style={color ? { color } : undefined}>
            {box.grade ? `${gradeLabel(box.grade)} · ` : ""}
            {boxCategoryLabel(box.category)}
          </p>
          {box.firstDropOnly ? (
            <p className={cn("m-0 truncate text-xs text-gold")}>{FIRST_DROP_ONLY_LABEL}</p>
          ) : null}
          {box.dropStageRangeLabel && box.dropStageRangeLabel !== "—" ? (
            <p className="m-0 truncate text-xs text-muted">{box.dropStageRangeLabel}</p>
          ) : null}
        </div>
      </div>

      {box.firstDropOnly && box.firstDropStages.length > 0 ? (
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
              {filteredFirstStages.map((stage, i) => (
                <DataListRow key={stage.stageKey} index={i}>
                  <ItemLink
                    node={{ type: "stage", id: stage.stageKey }}
                    name={stage.stageName}
                    suffix={`· ${stageName(stage.stageKey)}`}
                    onNavigate={onNavigate}
                  />
                </DataListRow>
              ))}
            </DataList>
          </Card>
        </div>
      ) : null}

      {!box.firstDropOnly && box.stages.length > 0 ? (
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
              {filteredFarmStages.map((stage, i) => (
                <DataListRow key={stage.stageKey} index={i}>
                  <ItemLink
                    node={{ type: "stage", id: stage.stageKey }}
                    name={stage.stageName}
                    suffix={`· ${stageName(stage.stageKey)} · ${boxDropViaLabel(stage.via)} · ${fmtDropPct(stage.spawnPct)}%`}
                    onNavigate={onNavigate}
                  />
                </DataListRow>
              ))}
            </DataList>
          </Card>
        </div>
      ) : null}

      {box.drops.length > 0 ? (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <BoxLoot drops={box.drops} onNavigate={onNavigate} peekItem={peekItem} />
        </div>
      ) : null}
    </Card>
  );
}
