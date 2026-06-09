import { gradeLabel, typeLabel } from "../../../core/labels";
import type { LocationFilter, SortKey } from "../../lib/inventoryFilters";

export interface InventoryFiltersProps {
  query: string;
  tradableOnly: boolean;
  inUseOnly: boolean;
  gradeFilter: string;
  typeFilter: string;
  locationFilter: LocationFilter;
  gradeOptions: string[];
  typeOptions: string[];
  shownCount: number;
  onQueryChange: (q: string) => void;
  onTradableOnlyChange: (v: boolean) => void;
  onInUseOnlyChange: (v: boolean) => void;
  onGradeFilterChange: (g: string) => void;
  onTypeFilterChange: (t: string) => void;
  onLocationFilterChange: (l: LocationFilter) => void;
}

export function InventoryFilters({
  query,
  tradableOnly,
  inUseOnly,
  gradeFilter,
  typeFilter,
  locationFilter,
  gradeOptions,
  typeOptions,
  shownCount,
  onQueryChange,
  onTradableOnlyChange,
  onInUseOnlyChange,
  onGradeFilterChange,
  onTypeFilterChange,
  onLocationFilterChange,
}: InventoryFiltersProps) {
  return (
    <div className="inv-controls">
      <input
        className="inv-search"
        placeholder="Search items..."
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />
      <select
        className="inv-filter"
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
      </select>
      <select
        className="inv-filter"
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
      </select>
      <select
        className="inv-filter"
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
      </select>
      <label className="inv-toggle">
        <input
          type="checkbox"
          checked={tradableOnly}
          onChange={(e) => onTradableOnlyChange(e.target.checked)}
        />
        Tradable only
      </label>
      <label className="inv-toggle">
        <input type="checkbox" checked={inUseOnly} onChange={(e) => onInUseOnlyChange(e.target.checked)} />
        In use only
      </label>
      <span className="muted small">{shownCount} shown</span>
    </div>
  );
}

export type { SortKey };
