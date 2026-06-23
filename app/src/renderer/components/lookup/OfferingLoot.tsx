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
import { Field } from "../../design-system/primitives/Field/Field";
import { MultiSelect } from "../../design-system/primitives/MultiSelect/MultiSelect";
import type { SelectOption } from "../../design-system/primitives/Select/Select";
import { SortControl } from "../filters/SortControl";
import { FilterBar } from "../filters/FilterBar";
import { SectionHeadingRow } from "./itemCardParts";
import { ItemLink } from "./ItemLink";
import type { LookupItem, OfferingEntry } from "../../../../shared/types";
import type { LookupNavNode } from "../../lib/useLookupNav";

const OFFERING_HELP =
  "Toss this coin into the Cube to roll one item from its loot table — you'll get exactly one. The % is your chance of getting that specific item.";

const OFFERING_LOOT_LABEL = "Offering Loot";

const SORT_OPTIONS: SelectOption[] = [
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
  const [gradeFilter, setGradeFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
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

      <FilterBar count={`${filtered.length} shown`}>
        <Field label="Search" className="w-44">
          <Input
            placeholder="Search loot..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </Field>
        <MultiSelect
          className="w-36"
          label="Grade"
          allLabel="All grades"
          value={gradeFilter}
          onValueChange={setGradeFilter}
          options={gradeOptions.map((g) => ({ value: g, label: gradeLabel(g) }))}
        />
        <MultiSelect
          className="w-36"
          label="Type"
          allLabel="All types"
          searchable={false}
          value={typeFilter}
          onValueChange={setTypeFilter}
          options={typeOptions.map((t) => ({ value: t, label: t }))}
        />
        <SortControl
          className="w-40"
          options={SORT_OPTIONS}
          sortKey={sortKey}
          onSortKeyChange={(key) => handleSortKeyChange(key as OfferingLootSortKey)}
          sortDir={sortDir}
          onSortDirToggle={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
        />
      </FilterBar>

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
