import { LuArrowDownNarrowWide, LuArrowUpNarrowWide } from "react-icons/lu";
import { Select, type SelectOption } from "../../design-system/primitives/Select/Select";
import { cn } from "../../design-system/lib/variants";

/**
 * Grouped sort control: an inline "Sort by" label plus a glued segment — the
 * sort-key select and a direction toggle share one rounded border (Bootstrap
 * button-group style). Used by the card/list surfaces (Lookup); Inventory sorts
 * via its data-table headers and the Coin view is fixed-sorted, so neither uses
 * this control.
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
    <div className={cn("flex shrink-0 items-center gap-2", className)}>
      <span className="whitespace-nowrap text-[10px] font-medium uppercase tracking-wide text-muted">
        {label}
      </span>
      <div className="inline-flex items-stretch overflow-hidden rounded-md border border-border">
        <Select
          className="w-28"
          triggerClassName="rounded-none border-0 focus-visible:outline-none"
          value={sortKey}
          onValueChange={(value) => onSortKeyChange(String(value))}
          options={options}
          title="Sort by"
        />
        {/* Raw button: glued to Select's trigger — no Button primitive (would break the shared border seam). */}
        <button
          type="button"
          onClick={onSortDirToggle}
          title={ascending ? "Ascending" : "Descending"}
          aria-label={ascending ? "Sort ascending" : "Sort descending"}
          className="flex items-center justify-center border-l border-border bg-card px-2 text-fg hover:bg-panel focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-ideal/50"
        >
          {ascending ? <LuArrowUpNarrowWide aria-hidden /> : <LuArrowDownNarrowWide aria-hidden />}
        </button>
      </div>
    </div>
  );
}
