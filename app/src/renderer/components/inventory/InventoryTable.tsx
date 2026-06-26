import { memo, useMemo, type ReactNode } from "react";
import { gradeLabel, typeLabel } from "../../../core/labels";
import {
  isInventoryColumnVisible,
  normalizeInventoryTablePrefs,
} from "../../../core/inventory/columnPrefs";
import { formatMoney, formatRawMoney } from "../../../core/steamPrice";
import { unassignedCount } from "../../../core/inventory/location";
import { gradeColor } from "../../lib/gradeColor";
import { useLookupCatalog } from "../../lib/useLookupCatalog";
import { useEntityPanel } from "../../context/entityPanelContext";
import { ItemLink } from "../ItemLink";
import { MarketListingLink } from "./MarketListingLink";
import { MarketPriceCell } from "./MarketPriceCell";
import { ItemPriceRefreshButton } from "./ItemPriceRefreshButton";
import type {
  InventoryColumnId,
  InventoryTablePrefs,
  LookupItem,
  ResolvedInventoryRow,
} from "../../../../shared/types";
import { Badge } from "../../design-system/primitives/Badge/Badge";
import { Button } from "../../design-system/primitives/Button/Button";
import { Card } from "../../design-system/primitives/Card/Card";
import { cn } from "../../lib/cn";
import { buyOrderAverage, type SortKey } from "../../lib/inventoryFilters";

function priceSourceTitle(source: ResolvedInventoryRow["priceSource"]): string | undefined {
  if (source === "median") return "Recent sale median on Steam Market";
  if (source === "lowest") return "Lowest listing (no recent sales on Steam)";
  return undefined;
}

function emptyBuyOrderDisplay(row: ResolvedInventoryRow): { label: string; title: string } {
  if (row.buyOrderChecked) {
    return {
      label: "No buy orders",
      title: "No buy orders on Steam Market for this item",
    };
  }
  return {
    label: "—",
    title: "Buy order not loaded yet",
  };
}

export interface InventoryTableProps {
  rows: ResolvedInventoryRow[];
  currency: string;
  columnPrefs: InventoryTablePrefs;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  onClearFilters: () => void;
  emptyMessage?: string;
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

type ColumnDef = {
  id: InventoryColumnId | "name" | "count";
  label: string;
  sortKey?: SortKey;
  align: "left" | "right";
  alwaysVisible?: boolean;
  render: (row: ResolvedInventoryRow, currency: string) => ReactNode;
};

function buildColumnDefs(
  itemIndex: Map<number, LookupItem>,
  onNavigate: (itemKey: number) => void,
): ColumnDef[] {
  return [
    {
      id: "name",
      label: "Name",
      sortKey: "name",
      align: "left",
      alwaysVisible: true,
      render: (row) => {
        const catalogItem = itemIndex.get(row.itemKey);
        const suffix = row.chaoticCount > 0 ? "◆" : undefined;
        const refreshButton = row.marketHashName ? (
          <ItemPriceRefreshButton itemKey={row.itemKey} itemName={row.name} />
        ) : null;

        if (catalogItem) {
          return (
            <span className="inline-flex min-w-0 items-center gap-0.5">
              <ItemLink
                node={{ type: "item", id: row.itemKey }}
                name={row.name}
                grade={row.grade}
                iconPath={catalogItem.iconPath}
                suffix={suffix}
                onNavigate={() => onNavigate(row.itemKey)}
                peekItem={(id) => itemIndex.get(id)}
              />
              {refreshButton}
            </span>
          );
        }

        return (
          <span className="inline-flex min-w-0 items-center gap-0.5">
            <span
              className="mr-1 inline-block size-[9px] shrink-0 rounded-full"
              style={{ background: gradeColor(row.grade) }}
            />
            <span className="min-w-0 truncate">{row.name}</span>
            {row.chaoticCount > 0 && (
              <span className="shrink-0 text-gold" title="Chaotic">
                {" "}
                &#9670;
              </span>
            )}
            {refreshButton}
          </span>
        );
      },
    },
    {
      id: "grade",
      label: "Grade",
      sortKey: "grade",
      align: "left",
      render: (row) => (
        <span style={{ color: gradeColor(row.grade) }}>{gradeLabel(row.grade)}</span>
      ),
    },
    {
      id: "level",
      label: "Level",
      sortKey: "level",
      align: "right",
      render: (row) => (row.level != null ? row.level : <span className="text-muted">-</span>),
    },
    {
      id: "type",
      label: "Type",
      sortKey: "type",
      align: "left",
      render: (row) => <span className="text-muted">{typeLabel(row.type)}</span>,
    },
    {
      id: "count",
      label: "Count",
      sortKey: "count",
      align: "right",
      alwaysVisible: true,
      render: (row) => row.count,
    },
    {
      id: "location",
      label: "Location",
      align: "right",
      render: (row) => {
        const inUse = row.inUseCount ?? 0;
        return (
          <>
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
          </>
        );
      },
    },
    {
      id: "inUse",
      label: "Equipped",
      sortKey: "inUse",
      align: "right",
      render: (row) => {
        const inUse = row.inUseCount ?? 0;
        if (inUse <= 0) return <span className="text-muted">-</span>;
        const title =
          inUse < row.count
            ? `${inUse} of ${row.count} owned are currently equipped; the rest are in your inventory/stash`
            : "All owned copies are currently equipped";
        return (
          <span className="text-accent" title={title}>
            {inUse}
            {inUse < row.count ? `/${row.count}` : ""}
          </span>
        );
      },
    },
    {
      id: "marketPrice",
      label: "Market price",
      sortKey: "price",
      align: "right",
      render: (row, currency) => {
        if (!row.marketHashName) {
          return (
            <span className="text-muted" title="Not priced (non-tradable or below Legendary gear)">
              -
            </span>
          );
        }
        return <MarketPriceCell row={row} hash={row.marketHashName} currency={currency} />;
      },
    },
    {
      id: "listValue",
      label: "Market total",
      sortKey: "value",
      align: "right",
      render: (row, currency) => {
        if (!row.marketHashName) return "-";
        return (
          <MarketListingLink
            hash={row.marketHashName}
            title={
              row.value != null && Number.isFinite(row.value)
                ? `${priceSourceTitle(row.priceSource) ?? "Steam Market"} · total if listed at market price`
                : "Open on Steam Market"
            }
          >
            {row.value != null && Number.isFinite(row.value)
              ? formatMoney(row.value, currency)
              : "-"}
          </MarketListingLink>
        );
      },
    },
    {
      id: "instantSell",
      label: "Instant sell",
      sortKey: "buyOrder",
      align: "right",
      render: (row, currency) => {
        if (!row.marketHashName) return "-";
        const empty = emptyBuyOrderDisplay(row);
        if (row.buyOrderRaw) {
          const display = formatRawMoney(row.buyOrderRaw, currency) ?? row.buyOrderRaw;
          return (
            <MarketListingLink
              hash={row.marketHashName}
              title="Highest buy order — price if you sold to the order book immediately"
            >
              {display}
            </MarketListingLink>
          );
        }
        return (
          <MarketListingLink hash={row.marketHashName} title={empty.title}>
            <span className="text-muted">{empty.label}</span>
          </MarketListingLink>
        );
      },
    },
    {
      id: "instantTotal",
      label: "Instant total",
      sortKey: "buyOrderValue",
      align: "right",
      render: (row, currency) => {
        if (!row.marketHashName) return "-";
        const covered = row.buyOrderCoveredCount ?? 0;
        const capped = row.buyOrderValue != null && covered < row.count;
        const title = capped
          ? `Selling into the order book level-by-level — covers ${covered.toLocaleString()} of ${row.count.toLocaleString()} owned; no buy orders deep enough for the rest. No listing fees.`
          : "Selling into the order book level-by-level, best price first. No listing fees.";
        return (
          <MarketListingLink hash={row.marketHashName} title={title}>
            {row.buyOrderValue != null && Number.isFinite(row.buyOrderValue)
              ? formatMoney(row.buyOrderValue, currency)
              : "-"}
            {capped ? (
              <Badge variant="muted" className="ml-1.5">
                {covered.toLocaleString()} / {row.count.toLocaleString()}
              </Badge>
            ) : null}
          </MarketListingLink>
        );
      },
    },
    {
      id: "instantSellAverage",
      label: "Instant avg",
      sortKey: "buyOrderAverage",
      align: "right",
      render: (row, currency) => {
        if (!row.marketHashName) return "-";
        const average = buyOrderAverage(row);
        return (
          <MarketListingLink
            hash={row.marketHashName}
            title="Average price per unit across the order-book levels used to fill this stack."
          >
            {average != null && Number.isFinite(average) ? formatMoney(average, currency) : "-"}
          </MarketListingLink>
        );
      },
    },
  ]; // end buildColumnDefs
}

function visibleColumns(defs: ColumnDef[], prefs: InventoryTablePrefs): ColumnDef[] {
  const normalized = normalizeInventoryTablePrefs(prefs);
  return defs.filter((col) => {
    if (col.alwaysVisible) return true;
    return isInventoryColumnVisible(normalized, col.id as InventoryColumnId);
  });
}

const InventoryRow = memo(function InventoryRow({
  row,
  currency,
  columns,
}: {
  row: ResolvedInventoryRow;
  currency: string;
  columns: ColumnDef[];
}) {
  return (
    <tr
      className={cn(
        "hover:bg-card [content-visibility:auto] [contain-intrinsic-size:0_36px]",
        !row.known && "opacity-70",
      )}
    >
      {columns.map((col) => (
        <td key={col.id} className={col.align === "right" ? tdNumClass : tdClass}>
          {col.render(row, currency)}
        </td>
      ))}
    </tr>
  );
});

export function InventoryTable({
  rows,
  currency,
  columnPrefs,
  sortKey,
  sortDir,
  onSort,
  onClearFilters,
  emptyMessage = "No items match these filters.",
}: InventoryTableProps) {
  const catalog = useLookupCatalog();
  const { open } = useEntityPanel();
  const itemIndex = useMemo(
    () => new Map((catalog ?? []).map((item) => [item.id, item])),
    [catalog],
  );
  const columnDefs = useMemo(
    () => buildColumnDefs(itemIndex, (id) => open({ type: "item", id })),
    [itemIndex, open],
  );
  const columns = visibleColumns(columnDefs, columnPrefs);

  return (
    <Card padding="none" className="min-h-[200px] flex-1 overflow-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            {columns.map((col) => {
              const th = col.align === "right" ? thNumClass : thClass;
              const clickable = col.sortKey != null;
              return (
                <th
                  key={col.id}
                  className={cn(th, !clickable && "cursor-default")}
                  onClick={col.sortKey ? () => onSort(col.sortKey!) : undefined}
                >
                  {col.label}
                  {col.sortKey ? (
                    <SortArrow active={sortKey === col.sortKey} dir={sortDir} />
                  ) : null}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-muted">
                {emptyMessage}{" "}
                <Button size="sm" className="ml-1.5" onClick={onClearFilters}>
                  Clear filters
                </Button>
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <InventoryRow key={row.itemKey} row={row} currency={currency} columns={columns} />
            ))
          )}
        </tbody>
      </table>
    </Card>
  );
}
