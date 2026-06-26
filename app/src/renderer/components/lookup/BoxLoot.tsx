import { useMemo, useState } from "react";
import { typeLabel } from "../../../core/labels";
import { fmtDropPct } from "../../lib/lookupDisplay";
import { filterAndSortBoxLoot, resolveBoxLoot } from "../../lib/boxLootFilters";
import { Card } from "../../design-system/primitives/Card/Card";
import { DataList, DataListRow } from "../../design-system/primitives/DataList/DataList";
import { Input } from "../../design-system/primitives/Input/Input";
import { SectionHeadingRow } from "./itemCardParts";
import { ItemLink } from "../ItemLink";
import type { LookupBoxDrop, LookupItem } from "../../../../shared/types";
import type { LookupNavNode } from "../../lib/useLookupNav";

const BOX_LOOT_HELP =
  "Opening this chest yields exactly one item from its loot table. The % is your chance of getting that specific item.";

const BOX_LOOT_LABEL = "Loot table";

export function BoxLoot({
  drops,
  onNavigate,
  peekItem,
}: {
  drops: LookupBoxDrop[];
  onNavigate?: (node: LookupNavNode) => void;
  peekItem: (id: number) => LookupItem | undefined;
}) {
  const [query, setQuery] = useState("");

  const resolved = useMemo(() => resolveBoxLoot(drops, peekItem), [drops, peekItem]);

  const filtered = useMemo(
    () =>
      filterAndSortBoxLoot(resolved, {
        query,
        gradeFilter: [],
        typeFilter: [],
        sortKey: "dropPct",
        sortDir: "desc",
      }),
    [resolved, query],
  );

  return (
    <div className="flex flex-col gap-2">
      <SectionHeadingRow
        label={BOX_LOOT_LABEL}
        help={BOX_LOOT_HELP}
        helpLabel="How chest loot works"
      />

      <div className="flex items-center gap-3">
        <Input
          className="min-w-0 flex-1"
          placeholder="Search loot..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="shrink-0 whitespace-nowrap text-xs text-muted">
          {filtered.length} items
        </span>
      </div>

      <Card padding="none" className="overflow-hidden">
        <DataList scrollable className="max-h-64">
          {filtered.length === 0 ? (
            <DataListRow index={0} className="text-xs text-muted">
              No loot matches your search.
            </DataListRow>
          ) : (
            filtered.map((row, i) => (
              <DataListRow key={row.itemKey} index={i}>
                <ItemLink
                  node={{ type: "item", id: row.itemKey }}
                  name={row.item?.name ?? row.name}
                  grade={row.item?.grade ?? row.grade}
                  iconPath={row.item?.iconPath}
                  suffix={`· ${fmtDropPct(row.dropPct)}%${row.item ? ` · ${typeLabel(row.item.type)}` : ""}`}
                  onNavigate={onNavigate}
                  peekItem={peekItem}
                />
              </DataListRow>
            ))
          )}
        </DataList>
      </Card>
    </div>
  );
}
