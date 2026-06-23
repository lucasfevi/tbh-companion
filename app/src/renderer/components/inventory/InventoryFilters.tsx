import type { ReactNode } from "react";
import { gradeLabel, typeLabel } from "../../../core/labels";
import type { LocationFilter, SortKey } from "../../lib/inventoryFilters";
import { Input } from "../../design-system/primitives/Input/Input";
import { Checkbox } from "../../design-system/primitives/Checkbox/Checkbox";
import {
  MultiSelect,
  type MultiSelectOption,
} from "../../design-system/primitives/MultiSelect/MultiSelect";

const LOCATION_OPTIONS: MultiSelectOption[] = [
  { value: "inventory", label: "Inventory" },
  { value: "stash", label: "Stash" },
  { value: "trading", label: "Trading" },
  { value: "equipped", label: "Equipped" },
  { value: "unknown", label: "Unknown" },
];

export interface InventoryFiltersProps {
  query: string;
  tradableOnly: boolean;
  unequippedOnly: boolean;
  gradeFilter: string[];
  typeFilter: string[];
  locationFilter: LocationFilter[];
  gradeOptions: string[];
  typeOptions: string[];
  shownCount: number;
  columnPicker?: ReactNode;
  onQueryChange: (q: string) => void;
  onTradableOnlyChange: (v: boolean) => void;
  onUnequippedOnlyChange: (v: boolean) => void;
  onGradeFilterChange: (g: string[]) => void;
  onTypeFilterChange: (t: string[]) => void;
  onLocationFilterChange: (l: LocationFilter[]) => void;
}

export function InventoryFilters({
  query,
  tradableOnly,
  unequippedOnly,
  gradeFilter,
  typeFilter,
  locationFilter,
  gradeOptions,
  typeOptions,
  shownCount,
  columnPicker,
  onQueryChange,
  onTradableOnlyChange,
  onUnequippedOnlyChange,
  onGradeFilterChange,
  onTypeFilterChange,
  onLocationFilterChange,
}: InventoryFiltersProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <MultiSelect
          className="w-40"
          label="Grade"
          allLabel="All grades"
          value={gradeFilter}
          onValueChange={onGradeFilterChange}
          options={gradeOptions.map((g) => ({ value: g, label: gradeLabel(g) }))}
        />
        <MultiSelect
          className="w-40"
          label="Item type"
          allLabel="All item types"
          searchable={false}
          value={typeFilter}
          onValueChange={onTypeFilterChange}
          options={typeOptions.map((t) => ({ value: t, label: typeLabel(t) }))}
        />
        <MultiSelect
          className="w-40"
          label="Location"
          allLabel="All locations"
          searchable={false}
          value={locationFilter}
          onValueChange={(value) => onLocationFilterChange(value as LocationFilter[])}
          options={LOCATION_OPTIONS}
        />
      </div>

      <div className="flex items-center gap-4">
        <Input
          className="min-w-0 flex-1"
          placeholder="Search items..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
        <span className="shrink-0 whitespace-nowrap text-xs text-muted">{shownCount} items</span>
        <span title="Hides only items where every copy you own is equipped. Items with some copies equipped and some in your inventory/stash still show.">
          <Checkbox
            label="Unequipped only"
            checked={unequippedOnly}
            onCheckedChange={onUnequippedOnlyChange}
          />
        </span>
        <Checkbox
          label="Tradable only"
          checked={tradableOnly}
          onCheckedChange={onTradableOnlyChange}
        />
        {columnPicker != null ? <div className="ml-auto shrink-0">{columnPicker}</div> : null}
      </div>
    </div>
  );
}

export type { SortKey };
