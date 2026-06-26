import { useMemo, useState } from "react";
import { typeLabel } from "../../../core/labels";
import { fmtDropPct } from "../../lib/lookupDisplay";
import { filterAndSortLoot, resolveOfferingLoot } from "../../lib/offeringLootFilters";
import { Card } from "../../design-system/primitives/Card/Card";
import { DataList, DataListRow } from "../../design-system/primitives/DataList/DataList";
import { Input } from "../../design-system/primitives/Input/Input";
import { SectionHeadingRow } from "./itemCardParts";
import { ItemLink } from "../ItemLink";
import type { LookupItem, OfferingEntry } from "../../../../shared/types";
import type { LookupNavNode } from "../../lib/useLookupNav";

const OFFERING_HELP =
  "Toss this coin into the Cube to roll one item from its loot table — you'll get exactly one. The % is your chance of getting that specific item.";

const OFFERING_LOOT_LABEL = "Offering Loot";

export function OfferingLoot({
  offering,
  onNavigate,
  peekItem,
}: {
  offering: OfferingEntry;
  onNavigate?: (node: LookupNavNode) => void;
  peekItem: (id: number) => LookupItem | undefined;
}) {
  const [query, setQuery] = useState("");

  const resolved = useMemo(
    () => resolveOfferingLoot(offering.loot, peekItem),
    [offering, peekItem],
  );

  // The loot list is small and always ranked by drop chance — search is the only
  // filter; sort is fixed to drop % descending.
  const filtered = useMemo(
    () =>
      filterAndSortLoot(resolved, {
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
        label={OFFERING_LOOT_LABEL}
        help={OFFERING_HELP}
        helpLabel="How offerings work"
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
              No loot matches these filters.
            </DataListRow>
          ) : (
            filtered.map((row, i) => (
              <DataListRow key={row.itemKey} index={i}>
                <ItemLink
                  node={{ type: "item", id: row.itemKey }}
                  name={row.item?.name ?? `Item ${row.itemKey}`}
                  grade={row.item?.grade}
                  iconPath={row.item?.iconPath}
                  suffix={`· ${fmtDropPct(row.poolPct)}%${row.item ? ` · ${typeLabel(row.item.type)}` : ""}`}
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
