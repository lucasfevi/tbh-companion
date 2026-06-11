import { memo } from "react";
import { gradeLabel, typeLabel } from "../../../core/labels";
import { formatMoney } from "../../../core/steamPrice";
import { unassignedCount } from "../../../core/inventory/location";
import { gradeColor } from "./GradeBars";
import { MarketListingLink } from "./MarketListingLink";
import type { ResolvedInventoryRow } from "../../../../shared/types";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { cn } from "../../lib/cn";

function priceSourceTitle(source: ResolvedInventoryRow["priceSource"]): string | undefined {
  if (source === "median") return "Recent sale median on Steam Market";
  if (source === "lowest") return "Lowest listing (no recent sales on Steam)";
  return undefined;
}

export interface InventoryTableProps {
  rows: ResolvedInventoryRow[];
  currency: string;
  sortKey: "name" | "grade" | "level" | "type" | "count" | "inUse" | "price" | "value";
  sortDir: "asc" | "desc";
  onSort: (
    key: "name" | "grade" | "level" | "type" | "count" | "inUse" | "price" | "value",
  ) => void;
  onClearFilters: () => void;
}

function SortArrow({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return null;
  return <>{dir === "asc" ? " \u25b2" : " \u25bc"}</>;
}

const thClass =
  "sticky top-0 z-[1] bg-panel px-2.5 py-1.5 text-left text-muted cursor-pointer select-none border-b border-border font-semibold";
const thNumClass = cn(thClass, "text-right");
const tdClass = "px-2.5 py-1.5 border-b border-border";
const tdNumClass = cn(tdClass, "text-right");

const InventoryRow = memo(function InventoryRow({
  row,
  currency,
}: {
  row: ResolvedInventoryRow;
  currency: string;
}) {
  const inUse = row.inUseCount ?? 0;
  return (
    <tr
      className={cn(
        "hover:bg-card [content-visibility:auto] [contain-intrinsic-size:0_36px]",
        !row.known && "opacity-70",
      )}
    >
      <td className={tdClass}>
        <span
          className="mr-1 inline-block size-[9px] shrink-0 rounded-full"
          style={{ background: gradeColor(row.grade) }}
        />
        {row.name}
        {row.chaoticCount > 0 && (
          <span className="text-gold" title="Chaotic">
            {" "}
            &#9670;
          </span>
        )}
      </td>
      <td className={tdClass} style={{ color: gradeColor(row.grade) }}>
        {gradeLabel(row.grade)}
      </td>
      <td className={tdNumClass}>
        {row.level != null ? row.level : <span className="text-muted">-</span>}
      </td>
      <td className={cn(tdClass, "text-muted")}>{typeLabel(row.type)}</td>
      <td className={tdNumClass}>{row.count}</td>
      <td className={tdNumClass}>
        {(row.inventoryCount ?? 0) > 0 && (
          <span className="mr-1.5 inline-block text-[11px] text-muted" title="Inventory">
            Inv {row.inventoryCount}
          </span>
        )}
        {(row.stashCount ?? 0) > 0 && (
          <span className="mr-1.5 inline-block text-[11px] text-muted" title="Stash">
            St {row.stashCount}
          </span>
        )}
        {(row.tradingCount ?? 0) > 0 && (
          <span className="mr-1.5 inline-block text-[11px] text-muted" title="Trading">
            Tr {row.tradingCount}
          </span>
        )}
        {inUse > 0 && (
          <span className="mr-1.5 inline-block text-[11px] text-muted" title="Equipped">
            Eq {inUse}
          </span>
        )}
        {unassignedCount(row) > 0 && (
          <span className="mr-1.5 inline-block text-[11px] text-muted" title="Unassigned">
            ?
          </span>
        )}
      </td>
      <td className={tdNumClass}>
        {inUse > 0 ? (
          <span className="text-accent">
            {inUse}
            {inUse < row.count ? `/${row.count}` : ""}
          </span>
        ) : (
          <span className="text-muted">-</span>
        )}
      </td>
      <td className={tdNumClass}>
        {row.marketHashName ? (
          row.priceRaw ? (
            <MarketListingLink hash={row.marketHashName} title={priceSourceTitle(row.priceSource)}>
              {row.priceRaw}
            </MarketListingLink>
          ) : (
            <MarketListingLink hash={row.marketHashName} title="Open on Steam Market">
              <span className="text-muted">pending</span>
            </MarketListingLink>
          )
        ) : (
          <span className="text-muted" title="Not priced (non-tradable or below Legendary gear)">
            -
          </span>
        )}
      </td>
      <td className={tdNumClass}>
        {row.marketHashName ? (
          <MarketListingLink
            hash={row.marketHashName}
            title={
              row.value != null && Number.isFinite(row.value)
                ? `${priceSourceTitle(row.priceSource) ?? "Steam Market"} · stack value`
                : "Open on Steam Market"
            }
          >
            {row.value != null && Number.isFinite(row.value)
              ? formatMoney(row.value, currency)
              : "-"}
          </MarketListingLink>
        ) : (
          "-"
        )}
      </td>
    </tr>
  );
});

export function InventoryTable({
  rows,
  currency,
  sortKey,
  sortDir,
  onSort,
  onClearFilters,
}: InventoryTableProps) {
  return (
    <Card padding="none" className="min-h-[200px] flex-1 overflow-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            <th className={thClass} onClick={() => onSort("name")}>
              Name
              <SortArrow active={sortKey === "name"} dir={sortDir} />
            </th>
            <th className={thClass} onClick={() => onSort("grade")}>
              Grade
              <SortArrow active={sortKey === "grade"} dir={sortDir} />
            </th>
            <th className={thNumClass} onClick={() => onSort("level")}>
              Level
              <SortArrow active={sortKey === "level"} dir={sortDir} />
            </th>
            <th className={thClass} onClick={() => onSort("type")}>
              Type
              <SortArrow active={sortKey === "type"} dir={sortDir} />
            </th>
            <th className={thNumClass} onClick={() => onSort("count")}>
              Count
              <SortArrow active={sortKey === "count"} dir={sortDir} />
            </th>
            <th className={thNumClass}>Location</th>
            <th className={thNumClass} onClick={() => onSort("inUse")}>
              In use
              <SortArrow active={sortKey === "inUse"} dir={sortDir} />
            </th>
            <th className={thNumClass} onClick={() => onSort("price")}>
              Price
              <SortArrow active={sortKey === "price"} dir={sortDir} />
            </th>
            <th className={thNumClass} onClick={() => onSort("value")}>
              Value
              <SortArrow active={sortKey === "value"} dir={sortDir} />
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-3 py-6 text-center text-muted">
                No items match these filters.{" "}
                <Button size="sm" className="ml-1.5" onClick={onClearFilters}>
                  Clear filters
                </Button>
              </td>
            </tr>
          ) : (
            rows.map((row) => <InventoryRow key={row.itemKey} row={row} currency={currency} />)
          )}
        </tbody>
      </table>
    </Card>
  );
}
