import { gradeLabel, typeLabel } from "../../../core/labels";
import type { LocationFilter, SortKey } from "../../lib/inventoryFilters";
import { Field } from "../../design-system/primitives/Field/Field";
import { Input } from "../../design-system/primitives/Input/Input";
import { Switch } from "../../design-system/primitives/Switch/Switch";
import {
  MultiSelect,
  type MultiSelectOption,
} from "../../design-system/primitives/MultiSelect/MultiSelect";
import { FilterBar } from "../filters/FilterBar";

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
  onQueryChange,
  onTradableOnlyChange,
  onUnequippedOnlyChange,
  onGradeFilterChange,
  onTypeFilterChange,
  onLocationFilterChange,
}: InventoryFiltersProps) {
  return (
    <FilterBar count={`${shownCount} shown`}>
      <Field label="Search" className="w-48">
        <Input
          placeholder="Search items..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </Field>
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
        label="Type"
        allLabel="All types"
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
      <Field label="Tradable only" className="flex-row items-center gap-2 self-end pb-1.5">
        <Switch
          checked={tradableOnly}
          onCheckedChange={onTradableOnlyChange}
          aria-label="Tradable only"
        />
      </Field>
      <Field
        label="Unequipped only"
        className="flex-row items-center gap-2 self-end pb-1.5"
        title="Hides only items where every copy you own is equipped. Items with some copies equipped and some in your inventory/stash still show."
      >
        <Switch
          checked={unequippedOnly}
          onCheckedChange={onUnequippedOnlyChange}
          aria-label="Unequipped only"
        />
      </Field>
    </FilterBar>
  );
}

export type { SortKey };
