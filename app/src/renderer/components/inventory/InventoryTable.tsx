import { memo } from "react";
import { gradeLabel, typeLabel } from "../../../core/labels";
import { formatMoney } from "../../../core/steamPrice";
import { unassignedCount } from "../../../core/inventory/location";
import { gradeColor } from "./GradeBars";
import { MarketListingLink } from "./MarketListingLink";
import type { ResolvedInventoryRow } from "../../../../shared/types";

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
  onSort: (key: "name" | "grade" | "level" | "type" | "count" | "inUse" | "price" | "value") => void;
  onClearFilters: () => void;
}

function SortArrow({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return null;
  return <>{dir === "asc" ? " \u25b2" : " \u25bc"}</>;
}

const InventoryRow = memo(function InventoryRow({
  row,
  currency,
}: {
  row: ResolvedInventoryRow;
  currency: string;
}) {
  const inUse = row.inUseCount ?? 0;
  return (
    <tr className={row.known ? "inv-row" : "inv-row unknown-row"}>
      <td>
        <span className="grade-dot" style={{ background: gradeColor(row.grade) }} />
        {row.name}
        {row.chaoticCount > 0 && (
          <span className="chaotic" title="Chaotic">
            {" "}
            &#9670;
          </span>
        )}
      </td>
      <td style={{ color: gradeColor(row.grade) }}>{gradeLabel(row.grade)}</td>
      <td className="num">{row.level != null ? row.level : <span className="muted">-</span>}</td>
      <td className="muted">{typeLabel(row.type)}</td>
      <td className="num">{row.count}</td>
      <td className="num loc-cell">
        {(row.inventoryCount ?? 0) > 0 && <span title="Inventory">Inv {row.inventoryCount}</span>}
        {(row.stashCount ?? 0) > 0 && <span title="Stash">St {row.stashCount}</span>}
        {(row.tradingCount ?? 0) > 0 && <span title="Trading">Tr {row.tradingCount}</span>}
        {inUse > 0 && <span title="Equipped">Eq {inUse}</span>}
        {unassignedCount(row) > 0 && <span title="Unassigned">?</span>}
      </td>
      <td className="num">
        {inUse > 0 ? (
          <span className="in-use">
            {inUse}
            {inUse < row.count ? `/${row.count}` : ""}
          </span>
        ) : (
          <span className="muted">-</span>
        )}
      </td>
      <td className="num">
        {row.marketHashName ? (
          row.priceRaw ? (
            <MarketListingLink hash={row.marketHashName} title={priceSourceTitle(row.priceSource)}>
              {row.priceRaw}
            </MarketListingLink>
          ) : (
            <MarketListingLink hash={row.marketHashName} title="Open on Steam Market">
              <span className="muted">pending</span>
            </MarketListingLink>
          )
        ) : (
          <span className="muted" title="Not priced (non-tradable or below Legendary gear)">
            -
          </span>
        )}
      </td>
      <td className="num">
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
    <div className="inv-table-wrap">
      <table className="inv-table">
        <thead>
          <tr>
            <th onClick={() => onSort("name")}>
              Name
              <SortArrow active={sortKey === "name"} dir={sortDir} />
            </th>
            <th onClick={() => onSort("grade")}>
              Grade
              <SortArrow active={sortKey === "grade"} dir={sortDir} />
            </th>
            <th className="num" onClick={() => onSort("level")}>
              Level
              <SortArrow active={sortKey === "level"} dir={sortDir} />
            </th>
            <th onClick={() => onSort("type")}>
              Type
              <SortArrow active={sortKey === "type"} dir={sortDir} />
            </th>
            <th className="num" onClick={() => onSort("count")}>
              Count
              <SortArrow active={sortKey === "count"} dir={sortDir} />
            </th>
            <th className="num">Location</th>
            <th className="num" onClick={() => onSort("inUse")}>
              In use
              <SortArrow active={sortKey === "inUse"} dir={sortDir} />
            </th>
            <th className="num" onClick={() => onSort("price")}>
              Price
              <SortArrow active={sortKey === "price"} dir={sortDir} />
            </th>
            <th className="num" onClick={() => onSort("value")}>
              Value
              <SortArrow active={sortKey === "value"} dir={sortDir} />
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={9} className="inv-empty muted">
                No items match these filters.{" "}
                <button type="button" className="btn small-btn" onClick={onClearFilters}>
                  Clear filters
                </button>
              </td>
            </tr>
          ) : (
            rows.map((row) => <InventoryRow key={row.itemKey} row={row} currency={currency} />)
          )}
        </tbody>
      </table>
    </div>
  );
}
