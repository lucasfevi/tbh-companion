import { gradeLabel, typeLabel } from "../../../core/labels";
import {
  LEVEL_MAX,
  LEVEL_MIN,
  type LookupOptionGroup,
  type LookupSortKey,
} from "../../lib/lookupFilters";
import { Input } from "../../design-system/primitives/Input/Input";
import { Checkbox } from "../../design-system/primitives/Checkbox/Checkbox";
import { RangeSlider } from "../../design-system/primitives/RangeSlider/RangeSlider";
import { MultiSelect } from "../../design-system/primitives/MultiSelect/MultiSelect";
import { SortControl } from "../filters/SortControl";
import type { SelectOption } from "../../design-system/primitives/Select/Select";

const SORT_OPTIONS: SelectOption[] = [
  { value: "name", label: "Name" },
  { value: "grade", label: "Grade" },
  { value: "level", label: "Level" },
  { value: "type", label: "Type" },
];

const FILTER_LABEL = "text-[10px] font-medium uppercase tracking-wide text-muted";

export interface LookupFiltersProps {
  query: string;
  typeFilter: string[];
  gradeFilter: string[];
  gearTypeFilter: string[];
  materialKindFilter: string[];
  effectFilter: string[];
  uniqueOnly: boolean;
  levelRange: [number, number];
  sortKey: LookupSortKey;
  sortDir: "asc" | "desc";
  gradeOptions: string[];
  typeOptions: string[];
  gearTypeGroups: LookupOptionGroup[];
  materialKindOptions: string[];
  effectGroups: LookupOptionGroup[];
  shownCount: number;
  onQueryChange: (q: string) => void;
  onTypeFilterChange: (t: string[]) => void;
  onGradeFilterChange: (g: string[]) => void;
  onGearTypeFilterChange: (g: string[]) => void;
  onMaterialKindFilterChange: (m: string[]) => void;
  onEffectFilterChange: (e: string[]) => void;
  onUniqueOnlyChange: (v: boolean) => void;
  onLevelRangeChange: (range: [number, number]) => void;
  onSortKeyChange: (key: LookupSortKey) => void;
  onSortDirToggle: () => void;
}

export function LookupFilters({
  query,
  typeFilter,
  gradeFilter,
  gearTypeFilter,
  materialKindFilter,
  effectFilter,
  uniqueOnly,
  levelRange,
  sortKey,
  sortDir,
  gradeOptions,
  typeOptions,
  gearTypeGroups,
  materialKindOptions,
  effectGroups,
  shownCount,
  onQueryChange,
  onTypeFilterChange,
  onGradeFilterChange,
  onGearTypeFilterChange,
  onMaterialKindFilterChange,
  onEffectFilterChange,
  onUniqueOnlyChange,
  onLevelRangeChange,
  onSortKeyChange,
  onSortDirToggle,
}: LookupFiltersProps) {
  const showGearFilters = typeFilter.length === 0 || typeFilter.includes("GEAR");
  const showMaterialFilters = typeFilter.length === 0 || typeFilter.includes("MATERIAL");

  function toggleType(value: string, checked: boolean) {
    onTypeFilterChange(checked ? [...typeFilter, value] : typeFilter.filter((t) => t !== value));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <span className={FILTER_LABEL}>Item type</span>
          <div className="flex items-center gap-3 py-1.5">
            {typeOptions.map((type) => (
              <Checkbox
                key={type}
                label={typeLabel(type)}
                checked={typeFilter.includes(type)}
                onCheckedChange={(checked) => toggleType(type, checked)}
              />
            ))}
          </div>
        </div>

        <MultiSelect
          className="w-40"
          label="Grade"
          allLabel="All grades"
          value={gradeFilter}
          onValueChange={onGradeFilterChange}
          options={gradeOptions.map((g) => ({ value: g, label: gradeLabel(g) }))}
        />

        {showGearFilters ? (
          <MultiSelect
            className="w-44"
            label="Gear type"
            allLabel="All gear types"
            value={gearTypeFilter}
            onValueChange={onGearTypeFilterChange}
            options={gearTypeGroups}
          />
        ) : null}

        <MultiSelect
          className="w-44"
          label="Modifier"
          allLabel="All modifiers"
          value={effectFilter}
          onValueChange={onEffectFilterChange}
          options={effectGroups}
        />

        {showMaterialFilters ? (
          <MultiSelect
            className="w-44"
            label="Material kind"
            allLabel="All material kinds"
            value={materialKindFilter}
            onValueChange={onMaterialKindFilterChange}
            options={materialKindOptions.map((m) => ({ value: m, label: typeLabel(m) }))}
          />
        ) : null}
      </div>

      {showGearFilters ? (
        <div className="flex flex-wrap items-end gap-4">
          <RangeSlider
            className="w-48"
            label="Level"
            min={LEVEL_MIN}
            max={LEVEL_MAX}
            value={levelRange}
            onValueChange={onLevelRangeChange}
          />
          <Checkbox
            className="self-end pb-1.5"
            label="Unique only"
            checked={uniqueOnly}
            onCheckedChange={onUniqueOnlyChange}
          />
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <SortControl
          options={SORT_OPTIONS}
          sortKey={sortKey}
          onSortKeyChange={(key) => onSortKeyChange(key as LookupSortKey)}
          sortDir={sortDir}
          onSortDirToggle={onSortDirToggle}
        />
        <Input
          className="min-w-0 flex-1"
          placeholder="Search items..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
        <span className="shrink-0 whitespace-nowrap text-xs text-muted">{shownCount} items</span>
      </div>
    </div>
  );
}
