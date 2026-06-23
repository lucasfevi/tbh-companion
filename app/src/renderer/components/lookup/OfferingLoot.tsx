import { useMemo, useState } from "react";
import { gradeLabel, typeLabel } from "../../../core/labels";
import { fmtDropPct } from "../../lib/lookupDisplay";
import {
  defaultOfferingLootSortDir,
  filterAndSortLoot,
  gradeOptionsFromLoot,
  resolveOfferingLoot,
  typeOptionsFromLoot,
  type OfferingLootSortKey,
} from "../../lib/offeringLootFilters";
import { Card } from "../../design-system/primitives/Card/Card";
import { DataList, DataListRow } from "../../design-system/primitives/DataList/DataList";
import { Input } from "../../design-system/primitives/Input/Input";
import { Select } from "../../design-system/primitives/Select/Select";
import { Button } from "../../design-system/primitives/Button/Button";
import { SectionHeadingRow } from "./itemCardParts";
import { ItemLink } from "./ItemLink";
import type { LookupItem, OfferingEntry } from "../../../../shared/types";
import type { LookupNavNode } from "../../lib/useLookupNav";

const OFFERING_HELP =
  "Toss this coin into the Cube to roll one item from its loot table — you'll get exactly one. The % is your chance of getting that specific item.";

const OFFERING_LOOT_LABEL = "Offering Loot";

const SORT_OPTIONS: { value: OfferingLootSortKey; label: string }[] = [
  { value: "dropPct", label: "Drop %" },
  { value: "name", label: "Name" },
  { value: "grade", label: "Grade" },
];

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
  const [gradeFilter, setGradeFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState<OfferingLootSortKey>("dropPct");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function handleSortKeyChange(key: OfferingLootSortKey) {
    setSortKey(key);
    setSortDir(defaultOfferingLootSortDir(key));
  }

  const resolved = useMemo(
    () => resolveOfferingLoot(offering.loot, peekItem),
    [offering, peekItem],
  );

  const filtered = useMemo(
    () => filterAndSortLoot(resolved, { query, gradeFilter, typeFilter, sortKey, sortDir }),
    [resolved, query, gradeFilter, typeFilter, sortKey, sortDir],
  );

  const gradeOptions = useMemo(() => gradeOptionsFromLoot(resolved), [resolved]);
  const typeOptions = useMemo(() => typeOptionsFromLoot(resolved), [resolved]);

  return (
    <div className="flex flex-col gap-2">
      <SectionHeadingRow
        label={OFFERING_LOOT_LABEL}
        help={OFFERING_HELP}
        helpLabel="How offerings work"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="max-w-[12rem] flex-1"
          placeholder="Search loot..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Select
          className="min-w-0"
          value={gradeFilter}
          onValueChange={(value) => setGradeFilter(String(value))}
          title="Filter by grade"
          options={[
            { value: "ALL", label: "All grades" },
            ...gradeOptions.map((g) => ({ value: g, label: gradeLabel(g) })),
          ]}
        />
        <Select
          className="min-w-0"
          value={typeFilter}
          onValueChange={(value) => setTypeFilter(String(value))}
          title="Filter by type"
          options={[
            { value: "ALL", label: "All types" },
            ...typeOptions.map((t) => ({ value: t, label: t })),
          ]}
        />
        <div className="flex items-center gap-1">
          <Select
            className="min-w-0"
            value={sortKey}
            onValueChange={(value) => handleSortKeyChange(value as OfferingLootSortKey)}
            title="Sort by"
            options={SORT_OPTIONS}
          />
          <Button
            variant="icon"
            size="sm"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            title={sortDir === "asc" ? "Ascending" : "Descending"}
            aria-label={sortDir === "asc" ? "Sort ascending" : "Sort descending"}
          >
            {sortDir === "asc" ? "▲" : "▼"}
          </Button>
        </div>
        <span className="text-xs text-muted">{filtered.length} shown</span>
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
