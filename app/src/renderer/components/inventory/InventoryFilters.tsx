import { gradeLabel, typeLabel } from "../../../core/labels";
import type { LocationFilter, SortKey } from "../../lib/inventoryFilters";
import { Field } from "../ui/Field";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";

export interface InventoryFiltersProps {
  query: string;
  tradableOnly: boolean;
  unequippedOnly: boolean;
  gradeFilter: string;
  typeFilter: string;
  locationFilter: LocationFilter;
  gradeOptions: string[];
  typeOptions: string[];
  shownCount: number;
  onQueryChange: (q: string) => void;
  onTradableOnlyChange: (v: boolean) => void;
  onUnequippedOnlyChange: (v: boolean) => void;
  onGradeFilterChange: (g: string) => void;
  onTypeFilterChange: (t: string) => void;
  onLocationFilterChange: (l: LocationFilter) => void;
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
    <div className="flex flex-wrap items-center gap-3">
      <Input
        className="max-w-xs flex-1"
        placeholder="Search items..."
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />
      <Select
        className="min-w-0"
        value={gradeFilter}
        onChange={(e) => onGradeFilterChange(e.target.value)}
        title="Filter by grade"
      >
        <option value="ALL">All grades</option>
        {gradeOptions.map((g) => (
          <option key={g} value={g}>
            {gradeLabel(g)}
          </option>
        ))}
      </Select>
      <Select
        className="min-w-0"
        value={typeFilter}
        onChange={(e) => onTypeFilterChange(e.target.value)}
        title="Filter by type"
      >
        <option value="ALL">All types</option>
        {typeOptions.map((t) => (
          <option key={t} value={t}>
            {typeLabel(t)}
          </option>
        ))}
      </Select>
      <Select
        className="min-w-0"
        value={locationFilter}
        onChange={(e) => onLocationFilterChange(e.target.value as LocationFilter)}
        title="Filter by storage location"
      >
        <option value="ALL">All locations</option>
        <option value="inventory">Inventory</option>
        <option value="stash">Stash</option>
        <option value="trading">Trading</option>
        <option value="equipped">Equipped</option>
        <option value="unknown">Unknown</option>
      </Select>
      <Field label="Tradable only" checkbox>
        <input
          type="checkbox"
          checked={tradableOnly}
          onChange={(e) => onTradableOnlyChange(e.target.checked)}
        />
      </Field>
      <Field label="Unequipped only" checkbox>
        <input
          type="checkbox"
          checked={unequippedOnly}
          onChange={(e) => onUnequippedOnlyChange(e.target.checked)}
        />
      </Field>
      <span className="text-xs text-muted">{shownCount} shown</span>
    </div>
  );
}

export type { SortKey };
