import { gradeLabel, typeLabel } from "../../../core/labels";
import {
  LEVEL_MAX,
  LEVEL_MIN,
  type LookupEffectOption,
  type LookupSortKey,
} from "../../lib/lookupFilters";
import { Field } from "../../design-system/primitives/Field/Field";
import { Input } from "../../design-system/primitives/Input/Input";
import { Switch } from "../../design-system/primitives/Switch/Switch";
import { RangeSlider } from "../../design-system/primitives/RangeSlider/RangeSlider";
import {
  MultiSelect,
  type MultiSelectOption,
} from "../../design-system/primitives/MultiSelect/MultiSelect";
import { SortControl } from "../filters/SortControl";
import { FilterBar } from "../filters/FilterBar";
import type { SelectOption } from "../../design-system/primitives/Select/Select";

const SORT_OPTIONS: SelectOption[] = [
  { value: "name", label: "Name" },
  { value: "grade", label: "Grade" },
  { value: "level", label: "Level" },
  { value: "type", label: "Type" },
];

function toOptions(values: string[], label: (value: string) => string): MultiSelectOption[] {
  return values.map((value) => ({ value, label: label(value) }));
}

export interface LookupFiltersProps {
  query: string;
  typeFilter: string[];
  gradeFilter: string[];
  gearTypeFilter: string[];
  classFilter: string[];
  materialKindFilter: string[];
  effectFilter: string[];
  uniqueOnly: boolean;
  levelRange: [number, number];
  sortKey: LookupSortKey;
  sortDir: "asc" | "desc";
  gradeOptions: string[];
  typeOptions: string[];
  gearTypeOptions: string[];
  classOptions: string[];
  materialKindOptions: string[];
  effectOptions: LookupEffectOption[];
  shownCount: number;
  onQueryChange: (q: string) => void;
  onTypeFilterChange: (t: string[]) => void;
  onGradeFilterChange: (g: string[]) => void;
  onGearTypeFilterChange: (g: string[]) => void;
  onClassFilterChange: (c: string[]) => void;
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
  classFilter,
  materialKindFilter,
  effectFilter,
  uniqueOnly,
  levelRange,
  sortKey,
  sortDir,
  gradeOptions,
  typeOptions,
  gearTypeOptions,
  classOptions,
  materialKindOptions,
  effectOptions,
  shownCount,
  onQueryChange,
  onTypeFilterChange,
  onGradeFilterChange,
  onGearTypeFilterChange,
  onClassFilterChange,
  onMaterialKindFilterChange,
  onEffectFilterChange,
  onUniqueOnlyChange,
  onLevelRangeChange,
  onSortKeyChange,
  onSortDirToggle,
}: LookupFiltersProps) {
  const showGearFilters = typeFilter.length === 0 || typeFilter.includes("GEAR");
  const showMaterialFilters = typeFilter.length === 0 || typeFilter.includes("MATERIAL");

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
        label="Type"
        allLabel="All types"
        searchable={false}
        value={typeFilter}
        onValueChange={onTypeFilterChange}
        options={toOptions(typeOptions, typeLabel)}
      />
      <MultiSelect
        className="w-40"
        label="Grade"
        allLabel="All grades"
        value={gradeFilter}
        onValueChange={onGradeFilterChange}
        options={toOptions(gradeOptions, gradeLabel)}
      />
      <MultiSelect
        className="w-44"
        label="Effect"
        allLabel="All effects"
        value={effectFilter}
        onValueChange={onEffectFilterChange}
        options={effectOptions}
      />

      {showGearFilters ? (
        <>
          <MultiSelect
            className="w-40"
            label="Gear slot"
            allLabel="All gear slots"
            value={gearTypeFilter}
            onValueChange={onGearTypeFilterChange}
            options={toOptions(gearTypeOptions, typeLabel)}
          />
          <MultiSelect
            className="w-40"
            label="Class"
            allLabel="All classes"
            value={classFilter}
            onValueChange={onClassFilterChange}
            options={toOptions(classOptions, (c) => c)}
          />
          <RangeSlider
            className="w-48"
            label="Level"
            min={LEVEL_MIN}
            max={LEVEL_MAX}
            value={levelRange}
            onValueChange={onLevelRangeChange}
          />
          <Field label="Unique only" className="flex-row items-center gap-2 self-end pb-1.5">
            <Switch
              checked={uniqueOnly}
              onCheckedChange={onUniqueOnlyChange}
              aria-label="Unique only"
            />
          </Field>
        </>
      ) : null}

      {showMaterialFilters ? (
        <MultiSelect
          className="w-44"
          label="Material kind"
          allLabel="All material kinds"
          value={materialKindFilter}
          onValueChange={onMaterialKindFilterChange}
          options={toOptions(materialKindOptions, typeLabel)}
        />
      ) : null}

      <SortControl
        className="w-44"
        options={SORT_OPTIONS}
        sortKey={sortKey}
        onSortKeyChange={(key) => onSortKeyChange(key as LookupSortKey)}
        sortDir={sortDir}
        onSortDirToggle={onSortDirToggle}
      />
    </FilterBar>
  );
}
