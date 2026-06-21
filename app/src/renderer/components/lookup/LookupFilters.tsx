import { gradeLabel, typeLabel } from "../../../core/labels";
import type { LookupEffectOption, LookupSortKey } from "../../lib/lookupFilters";
import { Input } from "../../design-system/primitives/Input/Input";
import { Select } from "../../design-system/primitives/Select/Select";
import { Field } from "../../design-system/primitives/Field/Field";
import { Button } from "../../design-system/primitives/Button/Button";

const SORT_OPTIONS: { value: LookupSortKey; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "grade", label: "Grade" },
  { value: "level", label: "Level" },
  { value: "type", label: "Type" },
];

const ANY_LEVEL = "ANY";

function levelSelectOptions(levels: number[]): { value: string | number; label: string }[] {
  return [
    { value: ANY_LEVEL, label: "Any" },
    ...levels.map((l) => ({ value: l, label: `Lv ${l}` })),
  ];
}

export interface LookupFiltersProps {
  query: string;
  typeFilter: string;
  gradeFilter: string;
  gearTypeFilter: string;
  classFilter: string;
  materialKindFilter: string;
  effectFilter: string;
  targetGroupFilter: string;
  uniqueOnly: boolean;
  minLevel: number | null;
  maxLevel: number | null;
  sortKey: LookupSortKey;
  sortDir: "asc" | "desc";
  gradeOptions: string[];
  typeOptions: string[];
  gearTypeOptions: string[];
  classOptions: string[];
  materialKindOptions: string[];
  effectOptions: LookupEffectOption[];
  targetGroupOptions: string[];
  levelOptions: number[];
  shownCount: number;
  onQueryChange: (q: string) => void;
  onTypeFilterChange: (t: string) => void;
  onGradeFilterChange: (g: string) => void;
  onGearTypeFilterChange: (g: string) => void;
  onClassFilterChange: (c: string) => void;
  onMaterialKindFilterChange: (m: string) => void;
  onEffectFilterChange: (e: string) => void;
  onTargetGroupFilterChange: (t: string) => void;
  onUniqueOnlyChange: (v: boolean) => void;
  onMinLevelChange: (level: number | null) => void;
  onMaxLevelChange: (level: number | null) => void;
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
  targetGroupFilter,
  uniqueOnly,
  minLevel,
  maxLevel,
  sortKey,
  sortDir,
  gradeOptions,
  typeOptions,
  gearTypeOptions,
  classOptions,
  materialKindOptions,
  effectOptions,
  targetGroupOptions,
  levelOptions,
  shownCount,
  onQueryChange,
  onTypeFilterChange,
  onGradeFilterChange,
  onGearTypeFilterChange,
  onClassFilterChange,
  onMaterialKindFilterChange,
  onEffectFilterChange,
  onTargetGroupFilterChange,
  onUniqueOnlyChange,
  onMinLevelChange,
  onMaxLevelChange,
  onSortKeyChange,
  onSortDirToggle,
}: LookupFiltersProps) {
  const showGearFilters = typeFilter !== "MATERIAL";
  const showMaterialFilters = typeFilter !== "GEAR";

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
        value={typeFilter}
        onValueChange={(value) => onTypeFilterChange(String(value))}
        title="Filter by item type"
        options={[
          { value: "ALL", label: "All types" },
          ...typeOptions.map((t) => ({ value: t, label: typeLabel(t) })),
        ]}
      />
      <Select
        className="min-w-0"
        value={gradeFilter}
        onValueChange={(value) => onGradeFilterChange(String(value))}
        title="Filter by grade"
        options={[
          { value: "ALL", label: "All grades" },
          ...gradeOptions.map((g) => ({ value: g, label: gradeLabel(g) })),
        ]}
      />
      <Select
        className="min-w-0"
        value={effectFilter}
        onValueChange={(value) => onEffectFilterChange(String(value))}
        title="Filter by effect"
        options={[{ value: "ALL", label: "All effects" }, ...effectOptions]}
      />

      {showGearFilters ? (
        <>
          <Select
            className="min-w-0"
            value={gearTypeFilter}
            onValueChange={(value) => onGearTypeFilterChange(String(value))}
            title="Filter by gear slot"
            options={[
              { value: "ALL", label: "All gear slots" },
              ...gearTypeOptions.map((g) => ({ value: g, label: typeLabel(g) })),
            ]}
          />
          <Select
            className="min-w-0"
            value={classFilter}
            onValueChange={(value) => onClassFilterChange(String(value))}
            title="Filter by class"
            options={[
              { value: "ALL", label: "All classes" },
              ...classOptions.map((c) => ({ value: c, label: c })),
            ]}
          />
          <Select
            className="min-w-0"
            value={minLevel ?? ANY_LEVEL}
            onValueChange={(value) => onMinLevelChange(value === ANY_LEVEL ? null : Number(value))}
            title="Minimum level"
            options={levelSelectOptions(levelOptions)}
          />
          <Select
            className="min-w-0"
            value={maxLevel ?? ANY_LEVEL}
            onValueChange={(value) => onMaxLevelChange(value === ANY_LEVEL ? null : Number(value))}
            title="Maximum level"
            options={levelSelectOptions(levelOptions)}
          />
          <Field label="Unique only" checkbox>
            <input
              type="checkbox"
              checked={uniqueOnly}
              onChange={(e) => onUniqueOnlyChange(e.target.checked)}
            />
          </Field>
        </>
      ) : null}

      {showMaterialFilters ? (
        <>
          <Select
            className="min-w-0"
            value={materialKindFilter}
            onValueChange={(value) => onMaterialKindFilterChange(String(value))}
            title="Filter by material kind"
            options={[
              { value: "ALL", label: "All material kinds" },
              ...materialKindOptions.map((m) => ({ value: m, label: typeLabel(m) })),
            ]}
          />
          <Select
            className="min-w-0"
            value={targetGroupFilter}
            onValueChange={(value) => onTargetGroupFilterChange(String(value))}
            title="Filter by what it applies to"
            options={[
              { value: "ALL", label: "Applies to anything" },
              ...targetGroupOptions.map((g) => ({ value: g, label: typeLabel(g) })),
            ]}
          />
        </>
      ) : null}

      <div className="flex items-center gap-1">
        <Select
          className="min-w-0"
          value={sortKey}
          onValueChange={(value) => onSortKeyChange(value as LookupSortKey)}
          title="Sort by"
          options={SORT_OPTIONS}
        />
        <Button
          variant="icon"
          size="sm"
          onClick={onSortDirToggle}
          title={sortDir === "asc" ? "Ascending" : "Descending"}
          aria-label={sortDir === "asc" ? "Sort ascending" : "Sort descending"}
        >
          {sortDir === "asc" ? "▲" : "▼"}
        </Button>
      </div>

      <span className="text-xs text-muted">{shownCount} shown</span>
    </div>
  );
}
