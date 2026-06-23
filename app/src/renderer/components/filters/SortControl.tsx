import { LuArrowDownNarrowWide, LuArrowUpNarrowWide } from "react-icons/lu";
import { Select, type SelectOption } from "../../design-system/primitives/Select/Select";
import { Button } from "../../design-system/primitives/Button/Button";
import { cn } from "../../design-system/lib/variants";

/**
 * Grouped sort control: a "Sort by" select paired with a direction toggle.
 * Used by the card/list surfaces (Lookup, Coin view) — Inventory sorts via its
 * data-table headers instead, so it does not use this control.
 */
export function SortControl({
  options,
  sortKey,
  onSortKeyChange,
  sortDir,
  onSortDirToggle,
  label = "Sort by",
  className,
}: {
  options: SelectOption[];
  sortKey: string;
  onSortKeyChange: (key: string) => void;
  sortDir: "asc" | "desc";
  onSortDirToggle: () => void;
  label?: string;
  className?: string;
}) {
  const ascending = sortDir === "asc";
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted">{label}</span>
      <div className="flex items-center gap-1">
        <Select
          className="min-w-0 flex-1"
          value={sortKey}
          onValueChange={(value) => onSortKeyChange(String(value))}
          options={options}
          title="Sort by"
        />
        <Button
          onClick={onSortDirToggle}
          className="px-2"
          title={ascending ? "Ascending" : "Descending"}
          aria-label={ascending ? "Sort ascending" : "Sort descending"}
        >
          {ascending ? <LuArrowUpNarrowWide aria-hidden /> : <LuArrowDownNarrowWide aria-hidden />}
        </Button>
      </div>
    </div>
  );
}
