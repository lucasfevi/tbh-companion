import { useEffect, useMemo, useRef, useState } from "react";
import { normalizeInventoryTablePrefs } from "../../core/inventory/columnPrefs";
import { useInventory } from "../lib/useInventory";
import { SteamPriceProgress } from "../components/market/SteamPriceProgress";
import {
  filterAndSortRows,
  gradeOptionsFromInventory,
  typeOptionsFromInventory,
  defaultSortDir,
  emptyInventoryFilterMessage,
  type SortKey,
  type LocationFilter,
} from "../lib/inventoryFilters";
import { computeInventoryComposition } from "../../core/inventory/composition";
import { TBH_MARKET_FEE_RATES } from "../../core/steamMarketFee";
import { InventorySummary } from "../components/inventory/InventorySummary";
import { InventoryFilters } from "../components/inventory/InventoryFilters";
import { InventoryColumnPicker } from "../components/inventory/InventoryColumnPicker";
import { InventoryTable } from "../components/inventory/InventoryTable";
import { TabHeader } from "../components/ui/TabHeader";
import { TabPage } from "../components/ui/TabPage";
import type { InventoryTablePrefs } from "../../../shared/types";
import { reportIpcError } from "../lib/reportError";

export function Inventory() {
  const inv = useInventory();
  const [query, setQuery] = useState("");
  const [tradableOnly, setTradableOnly] = useState(false);
  const [unequippedOnly, setUnequippedOnly] = useState(false);
  const [gradeFilter, setGradeFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [columnPrefs, setColumnPrefs] = useState<InventoryTablePrefs>(() =>
    normalizeInventoryTablePrefs(undefined),
  );
  const columnSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window.tbh?.getConfig !== "function") return;
    void window.tbh
      .getConfig()
      .then((config) => {
        if (config.inventoryTable) {
          setColumnPrefs(normalizeInventoryTablePrefs(config.inventoryTable));
        }
      })
      .catch(reportIpcError);
  }, []);

  function onColumnPrefsChange(next: InventoryTablePrefs): void {
    setColumnPrefs(next);
    if (columnSaveTimer.current) clearTimeout(columnSaveTimer.current);
    columnSaveTimer.current = setTimeout(() => {
      void window.tbh.saveConfig({ inventoryTable: next }).catch(reportIpcError);
    }, 300);
  }

  useEffect(() => {
    if (!inv) return;
    if (gradeFilter !== "ALL" && !inv.rows.some((r) => r.grade === gradeFilter)) {
      setGradeFilter("ALL");
    }
    if (typeFilter !== "ALL" && !inv.rows.some((r) => r.type === typeFilter)) {
      setTypeFilter("ALL");
    }
  }, [inv, gradeFilter, typeFilter]);

  const gradeOptions = useMemo(() => (inv ? gradeOptionsFromInventory(inv) : []), [inv]);
  const typeOptions = useMemo(() => (inv ? typeOptionsFromInventory(inv) : []), [inv]);

  const rows = useMemo(() => {
    if (!inv) return [];
    return filterAndSortRows(inv, {
      query,
      tradableOnly,
      unequippedOnly,
      gradeFilter,
      typeFilter,
      locationFilter,
      sortKey,
      sortDir,
    });
  }, [
    inv,
    query,
    tradableOnly,
    unequippedOnly,
    gradeFilter,
    typeFilter,
    locationFilter,
    sortKey,
    sortDir,
  ]);

  const composition = useMemo(
    () => computeInventoryComposition(rows, TBH_MARKET_FEE_RATES),
    [rows],
  );

  if (!inv) {
    return (
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-lg font-semibold">Inventory</h1>
        <p className="m-0 text-muted">
          Waiting for the save file... open the game so it writes a save.
        </p>
      </div>
    );
  }

  const currency = inv.currency ?? "USD";
  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(defaultSortDir(key));
    }
  }

  function clearFilters() {
    setQuery("");
    setTradableOnly(false);
    setUnequippedOnly(false);
    setGradeFilter("ALL");
    setTypeFilter("ALL");
    setLocationFilter("ALL");
  }

  return (
    <TabPage>
      <TabHeader title="Inventory" />

      <InventorySummary composition={composition} currency={currency} />

      <SteamPriceProgress variant="banner" />

      <div className="flex flex-wrap items-center gap-3">
        <InventoryFilters
          query={query}
          tradableOnly={tradableOnly}
          unequippedOnly={unequippedOnly}
          gradeFilter={gradeFilter}
          typeFilter={typeFilter}
          locationFilter={locationFilter}
          gradeOptions={gradeOptions}
          typeOptions={typeOptions}
          shownCount={rows.length}
          onQueryChange={setQuery}
          onTradableOnlyChange={setTradableOnly}
          onUnequippedOnlyChange={setUnequippedOnly}
          onGradeFilterChange={setGradeFilter}
          onTypeFilterChange={setTypeFilter}
          onLocationFilterChange={setLocationFilter}
        />
        <div className="ml-auto shrink-0">
          <InventoryColumnPicker prefs={columnPrefs} onChange={onColumnPrefsChange} />
        </div>
      </div>

      <InventoryTable
        rows={rows}
        currency={currency}
        columnPrefs={columnPrefs}
        sortKey={sortKey}
        sortDir={sortDir}
        emptyMessage={emptyInventoryFilterMessage(locationFilter)}
        onSort={toggleSort}
        onClearFilters={clearFilters}
      />
    </TabPage>
  );
}
